"""Chat service for document-aware conversations using CrewAI."""
import os
import logging
import time
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from pathlib import Path
from datetime import datetime

from crewai import Agent, Task, Crew
from crewai.memory import LongTermMemory
from crewai.memory.storage.ltm_sqlite_storage import LTMSQLiteStorage
import google.generativeai as genai
from pydantic import BaseModel

from ...schema.chat import (
    ChatRequest, ChatResponse, ChatMessage, MessageRole, 
    DocumentSource, ChatStreamChunk, ConversationSummary
)
from ...schema.document_analysis import TagModel
from ..config import get_settings
from ..processing import get_document_tool_factory
from ..selection import get_tag_based_selector
from ..error_handling.circuit_breaker import get_circuit_breaker_manager, CircuitBreakerConfig
from .crewai_service import get_document_analysis_service

# Configure logging
logger = logging.getLogger(__name__)

class ConversationContext(BaseModel):
    """Context for a conversation session."""
    conversation_id: str
    message_history: List[ChatMessage]
    document_context: List[str]
    last_activity: datetime
    metadata: Dict[str, Any]

class ChatService:
    """Service for handling chat conversations with document context using CrewAI."""
    
    def __init__(self):
        """Initialize the chat service."""
        self.settings = get_settings()
        
        if not self.settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        # Configure Gemini
        genai.configure(api_key=self.settings.gemini_api_key)
        
        # Base upload directory from settings
        self.upload_base_dir = Path(self.settings.upload_base_dir)
        
        # Initialize components
        self.tool_factory = get_document_tool_factory()
        self.tag_selector = get_tag_based_selector(max_documents=20)
        self.document_service = get_document_analysis_service()
        
        # Initialize memory storage
        self._init_memory_storage()
        
        # Initialize circuit breaker
        circuit_manager = get_circuit_breaker_manager()
        breaker_config = CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=30,
            success_threshold=2,
            timeout_seconds=30,
            rolling_window_seconds=300
        )
        self.circuit_breaker = circuit_manager.get_breaker("chat_service", breaker_config)
        
        # Active conversations
        self.active_conversations: Dict[str, ConversationContext] = {}
        
        # Service startup time
        self.startup_time = datetime.utcnow()
        
        logger.info("Chat service initialized successfully")
    
    def _init_memory_storage(self):
        """Initialize memory storage for conversations."""
        try:
            # Create storage directory with proper permissions
            storage_path = Path(self.settings.upload_base_dir) / "chat_memory"
            storage_path.mkdir(mode=0o700, exist_ok=True)
            
            # Initialize long-term memory for conversations
            self.memory_storage = LongTermMemory(
                storage=LTMSQLiteStorage(
                    db_path=str(storage_path / "conversations.db")
                )
            )
            
            logger.info(f"Memory storage initialized at {storage_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize memory storage: {e}")
            # Fallback to in-memory storage
            self.memory_storage = None
    
    def _create_chat_agents(self, conversation_id: str, document_paths: List[str]) -> Tuple[Agent, Agent]:
        """Create specialized chat agents with document tools."""
        # Get tools for the provided documents
        tools = []
        for doc_path in document_paths:
            try:
                full_path = self._validate_file_path(doc_path)
                tool = self.tool_factory.create_tool(full_path)
                tools.append(tool)
            except Exception as e:
                logger.warning(f"Failed to create tool for {doc_path}: {e}")
                continue
        
        # Chat agent for conversation and response generation
        chat_agent = Agent(
            role="AI Assistant",
            goal="Provide helpful, accurate responses based on user queries and available document context",
            backstory="""You are an intelligent AI assistant specialized in analyzing documents and 
            having natural conversations. You excel at understanding user intent, retrieving relevant 
            information from documents, and providing clear, helpful responses. You maintain conversation 
            context and can handle follow-up questions effectively.""",
            verbose=True,
            allow_delegation=True,
            tools=tools,
            memory=True,
            respect_context_window=True,
            llm="gemini/gemini-2.0-flash-exp"
        )
        
        # Context agent for document analysis and relevance scoring
        context_agent = Agent(
            role="Document Context Specialist",
            goal="Analyze document relevance and extract contextual information to support chat responses",
            backstory="""You are an expert at understanding document content and determining 
            its relevance to user queries. You specialize in extracting key information, 
            identifying relevant excerpts, and scoring document relevance. You work closely 
            with the AI Assistant to provide the best possible context for responses.""",
            verbose=True,
            allow_delegation=False,
            tools=tools,
            memory=True,
            respect_context_window=True,
            llm="gemini/gemini-2.0-flash-exp"
        )
        
        return chat_agent, context_agent
    
    def _create_chat_crew(
        self, 
        conversation_id: str, 
        user_message: str,
        document_paths: List[str],
        conversation_history: List[ChatMessage]
    ) -> Crew:
        """Create a CrewAI crew for chat processing."""
        
        # Create agents
        chat_agent, context_agent = self._create_chat_agents(conversation_id, document_paths)
        
        # Build conversation context
        history_context = ""
        if conversation_history:
            recent_messages = conversation_history[-5:]  # Last 5 messages for context
            history_context = "\n".join([
                f"{msg.role.value}: {msg.content}" 
                for msg in recent_messages
            ])
        
        # Create context analysis task
        context_task = Task(
            description=f"""Analyze the provided documents for relevance to the user's query: "{user_message}"
            
            Available documents: {', '.join(document_paths) if document_paths else 'None'}
            
            Your task is to:
            1. Determine which documents are most relevant to the query
            2. Extract relevant excerpts or key information
            3. Score the relevance of each document (0.0 to 1.0)
            4. Identify any specific sections or pages that are most pertinent
            
            Consider the conversation history:
            {history_context if history_context else 'No previous conversation'}
            
            Return a structured analysis of document relevance and key excerpts.
            """,
            agent=context_agent,
            expected_output="Structured analysis of document relevance with excerpts and scores"
        )
        
        # Create chat response task
        chat_task = Task(
            description=f"""Generate a helpful response to the user's message: "{user_message}"
            
            Use the document context analysis from the Context Specialist to inform your response.
            
            Conversation history:
            {history_context if history_context else 'This is the start of the conversation'}
            
            Guidelines:
            - Provide accurate, helpful information based on the available documents
            - Cite specific sources when referencing document content
            - Maintain a natural, conversational tone
            - If documents don't contain relevant information, say so clearly
            - Suggest follow-up questions when appropriate
            - Keep responses concise but comprehensive
            
            Your response should be natural and conversational while being informative.
            """,
            agent=chat_agent,
            context=[context_task],
            expected_output="A natural, helpful response to the user's query with source citations"
        )
        
        # Create crew with memory enabled
        crew = Crew(
            agents=[context_agent, chat_agent],
            tasks=[context_task, chat_task],
            verbose=True,
            memory=True,
            long_term_memory=self.memory_storage if self.memory_storage else None,
            embedder={
                "provider": "google",
                "config": {
                    "api_key": self.settings.gemini_api_key,
                    "model": "text-embedding-004"
                }
            }
        )
        
        return crew
    
    def _validate_file_path(self, document_path: str) -> str:
        """Validate and construct full file path."""
        # Ensure the path is relative and within upload directory
        if os.path.isabs(document_path):
            raise ValueError("Absolute paths are not allowed")
        
        if '..' in document_path:
            raise ValueError("Directory traversal is not allowed")
        
        # Construct full path
        full_path = self.upload_base_dir / document_path
        
        # Check if file exists
        if not full_path.exists():
            raise FileNotFoundError(f"Document not found: {document_path}")
        
        if not full_path.is_file():
            raise ValueError(f"Path is not a file: {document_path}")
        
        return str(full_path)
    
    def _extract_sources_from_result(self, result: Any, document_paths: List[str]) -> List[DocumentSource]:
        """Extract document sources from crew result."""
        sources = []
        
        try:
            # This is a simplified implementation
            # In practice, you would parse the actual crew output to identify sources
            for i, doc_path in enumerate(document_paths):
                sources.append(DocumentSource(
                    document_path=doc_path,
                    relevance_score=0.8 - (i * 0.1),  # Decreasing relevance
                    excerpt=f"Relevant content from {Path(doc_path).name}",
                    page_number=None
                ))
        except Exception as e:
            logger.error(f"Failed to extract sources: {e}")
        
        return sources
    
    def _generate_follow_up_suggestions(self, user_message: str, response_content: str) -> List[str]:
        """Generate follow-up question suggestions."""
        # Simple implementation - in practice, this could use AI to generate better suggestions
        suggestions = [
            "Can you provide more details about this topic?",
            "What are the key takeaways from these documents?",
            "Are there any related concepts I should know about?"
        ]
        
        return suggestions[:3]  # Return max 3 suggestions
    
    async def chat(self, request: ChatRequest) -> ChatResponse:
        """Process a chat request and return a response."""
        return await self.circuit_breaker.call(self._chat_internal, request=request)
    
    async def _chat_internal(self, request: ChatRequest) -> ChatResponse:
        """Internal chat processing implementation."""
        start_time = time.time()
        
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        try:
            logger.info(f"Processing chat request for conversation {conversation_id}")
            
            # Validate document paths
            validated_paths = []
            for doc_path in request.document_paths:
                try:
                    self._validate_file_path(doc_path)
                    validated_paths.append(doc_path)
                except Exception as e:
                    logger.warning(f"Invalid document path {doc_path}: {e}")
            
            # Get conversation history
            conversation_history = self._get_conversation_history(conversation_id)
            
            # Create user message
            user_message = ChatMessage(
                role=MessageRole.USER,
                content=request.message
            )
            
            # Add to conversation history
            conversation_history.append(user_message)
            
            # Create and execute crew
            crew = self._create_chat_crew(
                conversation_id=conversation_id,
                user_message=request.message,
                document_paths=validated_paths,
                conversation_history=conversation_history[:-1]  # Exclude current message
            )
            
            # Execute the crew
            result = crew.kickoff()
            
            # Create assistant response message
            assistant_message = ChatMessage(
                role=MessageRole.ASSISTANT,
                content=str(result)
            )
            
            # Extract sources if requested
            sources = []
            if request.include_sources and validated_paths:
                sources = self._extract_sources_from_result(result, validated_paths)
            
            # Generate follow-up suggestions
            follow_up_suggestions = self._generate_follow_up_suggestions(
                request.message, 
                assistant_message.content
            )
            
            # Update conversation context
            self._update_conversation_context(
                conversation_id, 
                [user_message, assistant_message],
                validated_paths
            )
            
            processing_time = time.time() - start_time
            
            logger.info(f"Chat request processed successfully in {processing_time:.2f}s")
            
            return ChatResponse(
                conversation_id=conversation_id,
                message=assistant_message,
                sources=sources,
                processing_time_seconds=processing_time,
                follow_up_suggestions=follow_up_suggestions
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Chat request failed: {e}")
            raise
    
    def _get_conversation_history(self, conversation_id: str) -> List[ChatMessage]:
        """Get conversation history for a given conversation ID."""
        if conversation_id in self.active_conversations:
            return self.active_conversations[conversation_id].message_history.copy()
        return []
    
    def _update_conversation_context(
        self, 
        conversation_id: str, 
        new_messages: List[ChatMessage],
        document_paths: List[str]
    ):
        """Update conversation context with new messages."""
        if conversation_id in self.active_conversations:
            context = self.active_conversations[conversation_id]
            context.message_history.extend(new_messages)
            context.last_activity = datetime.utcnow()
            context.document_context.extend(document_paths)
        else:
            # Create new conversation context
            self.active_conversations[conversation_id] = ConversationContext(
                conversation_id=conversation_id,
                message_history=new_messages,
                document_context=document_paths,
                last_activity=datetime.utcnow(),
                metadata={}
            )
    
    async def get_conversation_summary(self, conversation_id: str) -> Optional[ConversationSummary]:
        """Get summary of a conversation."""
        if conversation_id not in self.active_conversations:
            return None
        
        context = self.active_conversations[conversation_id]
        
        return ConversationSummary(
            conversation_id=conversation_id,
            message_count=len(context.message_history),
            start_time=context.message_history[0].timestamp if context.message_history else context.last_activity,
            last_activity=context.last_activity,
            summary="Conversation summary would be generated here",
            topics=["topic1", "topic2"]  # Would be extracted from conversation
        )
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of the chat service."""
        uptime = (datetime.utcnow() - self.startup_time).total_seconds()
        
        return {
            "status": "healthy",
            "conversation_memory_status": "healthy" if self.memory_storage else "degraded",
            "document_processing_status": "healthy",
            "active_conversations": len(self.active_conversations),
            "uptime_seconds": uptime,
            "last_check": datetime.utcnow()
        }

# Global service instance
_chat_service = None

def get_chat_service() -> ChatService:
    """Get or create the global chat service instance."""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service
