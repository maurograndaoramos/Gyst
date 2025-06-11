"""Chat service for document-aware conversations using CrewAI."""
import os
import logging
import time
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from pathlib import Path
from datetime import datetime, timedelta, timezone

from crewai import Agent, Task, Crew
from crewai.memory import LongTermMemory
from crewai.memory.storage.ltm_sqlite_storage import LTMSQLiteStorage
import google.generativeai as genai
from pydantic import BaseModel

from ...schema.chat import (
    ChatRequest, ChatResponse, ChatMessage, MessageRole, 
    DocumentSource, ChatStreamChunk, ConversationSummary, AgentStep
)
from ...schema.document_analysis import TagModel
from ..config import get_settings
from ..processing import get_document_tool_factory
from ..selection import get_tag_based_selector
from ..error_handling.circuit_breaker import get_circuit_breaker_manager, CircuitBreakerConfig
from ..memory import get_conversation_memory_manager
from .crewai_service import get_document_analysis_service
from .crewai_execution_listener import create_execution_listener

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
        
        # Initialize enhanced conversation memory manager
        self.memory_manager = get_conversation_memory_manager()
        
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
        self.startup_time = datetime.now(timezone.utc)
        
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
    
    def _create_chat_agents_with_execution_tracking(self, conversation_id: str, document_paths: List[str]) -> Tuple[Agent, Agent]:
        """Create specialized chat agents with enhanced execution tracking."""
        # This is the same as _create_chat_agents but could be enhanced for execution tracking
        return self._create_chat_agents(conversation_id, document_paths)
    
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
        
        # Try multiple possible path combinations for frontend upload structure
        possible_paths = [
            # Direct path from backend uploads
            self.upload_base_dir / document_path,
            # Frontend uploads structure
            Path("./frontend/uploads") / document_path,
            # Alternative frontend structure
            Path("../frontend/uploads") / document_path,
            # Current working directory frontend uploads
            Path().cwd() / "frontend" / "uploads" / document_path
        ]
        
        # Find the first valid path
        for full_path in possible_paths:
            try:
                if full_path.exists() and full_path.is_file():
                    logger.info(f"Found document at: {full_path}")
                    return str(full_path.resolve())
            except Exception as e:
                logger.debug(f"Path {full_path} invalid: {e}")
                continue
        
        # If no path found, log available directories for debugging
        logger.warning(f"Document not found: {document_path}")
        self._log_available_upload_directories()
        
        raise FileNotFoundError(f"Document not found: {document_path}")
    
    def _log_available_upload_directories(self):
        """Log available upload directories for debugging."""
        try:
            base_dirs_to_check = [
                Path("./uploads"),
                Path("./frontend/uploads"), 
                Path("../frontend/uploads"),
                Path().cwd() / "frontend" / "uploads"
            ]
            
            for base_dir in base_dirs_to_check:
                if base_dir.exists():
                    logger.info(f"Available upload directory: {base_dir.resolve()}")
                    # List first level subdirectories
                    try:
                        subdirs = [d.name for d in base_dir.iterdir() if d.is_dir()][:5]
                        if subdirs:
                            logger.info(f"  Subdirectories: {subdirs}")
                    except Exception:
                        pass
        except Exception as e:
            logger.debug(f"Error logging upload directories: {e}")
    
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
    
    def _extract_agent_processes_from_crew_result(self, crew_result: Any, execution_listener = None) -> Tuple[str, List[AgentStep]]:
        """Extract real agent thought processes and final answer from CrewAI result."""
        agent_steps = []
        final_answer = ""
        
        try:
            # Extract final answer from crew result
            final_answer = self._extract_final_answer_from_result(str(crew_result), crew_result)
            
            # Get real agent steps from execution listener if available
            if execution_listener:
                agent_steps = execution_listener.get_agent_steps()
                logger.info(f"Retrieved {len(agent_steps)} real agent execution steps from listener")
            else:
                # Fallback: parse crew result for task outputs
                agent_steps = self._parse_crew_tasks_for_agent_steps(crew_result)
                logger.warning("No execution listener available, using crew result parsing fallback")
            
            # Ensure we have at least one step
            if not agent_steps:
                fallback_step = AgentStep(
                    agent_name="AI Assistant",
                    agent_role="Task Processing",
                    thought_process="Successfully processed your request and generated a response.",
                    timestamp=datetime.now(timezone.utc),
                    status="completed"
                )
                agent_steps = [fallback_step]
                logger.info("Created fallback agent step")
            
        except Exception as e:
            logger.error(f"Error extracting agent processes: {e}")
            # Fallback: create a single agent step
            fallback_step = AgentStep(
                agent_name="AI Assistant",
                agent_role="General Assistant",
                thought_process="Processing your request and generating a helpful response.",
                timestamp=datetime.now(timezone.utc),
                status="completed"
            )
            agent_steps = [fallback_step]
            final_answer = str(crew_result) if crew_result else "I'm here to help!"
        
        return final_answer, agent_steps
    
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
        """Internal chat processing implementation with enhanced memory management."""
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
            
            # Create user message
            user_message = ChatMessage(
                role=MessageRole.USER,
                content=request.message
            )
            
            # Add user message to advanced memory manager
            await self.memory_manager.add_message(conversation_id, user_message)
            
            # Get relevant context from memory manager
            memory_context = await self.memory_manager.get_relevant_context(
                conversation_id, 
                request.message, 
                max_tokens=8000
            )
            
            # Get conversation history from enhanced memory
            conversation_state = await self.memory_manager.get_conversation_state(conversation_id)
            conversation_history = self._get_enhanced_conversation_history(
                conversation_id, 
                memory_context
            )
            
            # Create and execute crew with enhanced context and execution listener
            crew, execution_listener = self._create_enhanced_chat_crew(
                conversation_id=conversation_id,
                user_message=request.message,
                document_paths=validated_paths,
                conversation_history=conversation_history,
                memory_context=memory_context
            )
            
            # Execute the crew
            logger.info(f"Executing crew with real-time agent execution tracking for conversation {conversation_id}")
            result = crew.kickoff()
            
            # Extract agent processes and clean final answer using the execution listener
            final_answer, agent_steps = self._extract_agent_processes_from_crew_result(result, execution_listener)
            
            # Log execution summary
            if execution_listener:
                summary = execution_listener.get_execution_summary()
                logger.info(f"Execution completed with {summary['total_steps']} steps in {summary.get('execution_duration', 'unknown')} seconds")
            
            # Create assistant response message with clean final answer
            assistant_message = ChatMessage(
                role=MessageRole.ASSISTANT,
                content=final_answer
            )
            
            # Add assistant message to memory manager
            await self.memory_manager.add_message(conversation_id, assistant_message)
            
            # Extract sources if requested
            sources = []
            if request.include_sources and validated_paths:
                sources = self._extract_sources_from_result(result, validated_paths)
            
            # Generate enhanced follow-up suggestions based on topics and memory
            follow_up_suggestions = await self._generate_enhanced_follow_up_suggestions(
                request.message, 
                assistant_message.content,
                memory_context
            )
            
            # Update legacy conversation context for backward compatibility
            self._update_conversation_context(
                conversation_id, 
                [user_message, assistant_message],
                validated_paths
            )
            
            processing_time = time.time() - start_time
            
            logger.info(f"Chat request processed successfully in {processing_time:.2f}s")
            
            response = ChatResponse(
                conversation_id=conversation_id,
                message=assistant_message,
                sources=sources,
                agent_process=agent_steps,
                processing_time_seconds=processing_time,
                follow_up_suggestions=follow_up_suggestions,
                raw_crew_output=str(result)  # For debugging
            )
            
            # Debug logging to check what we're actually returning
            logger.info(f"Response agent_process length: {len(response.agent_process)}")
            logger.info(f"Response dict keys: {list(response.model_dump().keys())}")
            if response.agent_process:
                logger.info(f"First agent step: {response.agent_process[0].agent_name}")
            
            return response
            
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
            context.last_activity = datetime.now(timezone.utc)
            context.document_context.extend(document_paths)
        else:
            # Create new conversation context
            self.active_conversations[conversation_id] = ConversationContext(
                conversation_id=conversation_id,
                message_history=new_messages,
                document_context=document_paths,
                last_activity=datetime.now(timezone.utc),
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
    
    def _get_enhanced_conversation_history(self, conversation_id: str, memory_context: Dict[str, Any]) -> List[ChatMessage]:
        """Get enhanced conversation history using memory context."""
        # For now, fall back to the legacy method but could be enhanced with memory_context
        # In a full implementation, this would retrieve actual ChatMessage objects
        # based on the message IDs from memory_context['messages']
        return self._get_conversation_history(conversation_id)
    
    def _create_enhanced_chat_crew(
        self, 
        conversation_id: str, 
        user_message: str,
        document_paths: List[str],
        conversation_history: List[ChatMessage],
        memory_context: Dict[str, Any]
    ) -> Tuple[Crew, Any]:
        """Create an enhanced CrewAI crew with memory context and execution listener."""
        # Create execution listener for this conversation
        execution_listener = create_execution_listener(conversation_id)
        
        # Create agents with enhanced configuration
        chat_agent, context_agent = self._create_chat_agents_with_execution_tracking(conversation_id, document_paths)
        
        # Build enhanced conversation context with topics and summaries
        history_context = ""
        if conversation_history:
            recent_messages = conversation_history[-5:]  # Last 5 messages for context
            history_context = "\n".join([
                f"{msg.role.value}: {msg.content}" 
                for msg in recent_messages
            ])
        
        # Add topic context
        topic_context = ""
        if memory_context.get('topics'):
            topic_names = [topic.name for topic in memory_context['topics'][:3]]
            topic_context = f"\nCurrent conversation topics: {', '.join(topic_names)}"
        
        # Add summary context
        summary_context = ""
        if memory_context.get('summaries'):
            recent_summary = memory_context['summaries'][0]
            summary_context = f"\nRecent conversation summary: {recent_summary.content}"
        
        # Create enhanced context analysis task
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
            {topic_context}
            {summary_context}
            
            Return a structured analysis of document relevance and key excerpts.
            """,
            agent=context_agent,
            expected_output="Structured analysis of document relevance with excerpts and scores"
        )
        
        # Create enhanced chat response task
        chat_task = Task(
            description=f"""Generate a helpful response to the user's message: "{user_message}"
            
            Use the document context analysis from the Context Specialist to inform your response.
            
            Conversation context:
            {history_context if history_context else 'This is the start of the conversation'}
            {topic_context}
            {summary_context}
            
            Guidelines:
            - Provide accurate, helpful information based on the available documents
            - Cite specific sources when referencing document content
            - Maintain a natural, conversational tone
            - Consider the conversation topics and previous discussions
            - If documents don't contain relevant information, say so clearly
            - Suggest follow-up questions when appropriate
            - Keep responses concise but comprehensive
            
            Your response should be natural and conversational while being informative.
            """,
            agent=chat_agent,
            context=[context_task],
            expected_output="A natural, helpful response to the user's query with source citations"
        )
        
        # Define step callback to capture real-time execution
        def step_callback(step_output):
            """Capture step-by-step execution for agent thought process."""
            try:
                # Extract agent information
                agent_name = "Unknown Agent"
                agent_role = "Task Processing"
                
                if hasattr(step_output, 'agent') and step_output.agent:
                    agent_name = getattr(step_output.agent, 'role', 'Unknown Agent')
                    agent_role = getattr(step_output.agent, 'goal', 'Task Processing')
                
                # Add step to execution listener
                execution_listener.add_step_from_callback(step_output, agent_name, agent_role)
                
                logger.info(f"Step callback captured: {agent_name}")
                
            except Exception as e:
                logger.error(f"Error in step callback: {e}")
        
        # Create crew with memory enabled and execution tracking
        crew = Crew(
            agents=[context_agent, chat_agent],
            tasks=[context_task, chat_task],
            verbose=True,
            memory=True,
            step_callback=step_callback,  # Real-time step capture
            long_term_memory=self.memory_storage if self.memory_storage else None,
            embedder={
                "provider": "google",
                "config": {
                    "api_key": self.settings.gemini_api_key,
                    "model": "text-embedding-004"
                }
            }
        )
        
        return crew, execution_listener
    
    async def _generate_enhanced_follow_up_suggestions(
        self, 
        user_message: str, 
        response_content: str,
        memory_context: Dict[str, Any]
    ) -> List[str]:
        """Generate enhanced follow-up suggestions based on topics and memory."""
        suggestions = []
        
        # Topic-based suggestions
        if memory_context.get('topics'):
            for topic in memory_context['topics'][:2]:
                suggestions.append(f"Can you tell me more about {topic.name}?")
        
        # Context-based suggestions
        if memory_context.get('current_topic'):
            suggestions.append("What are the key aspects of this topic?")
        
        # Default suggestions if no specific topics
        if not suggestions:
            suggestions = [
                "Can you provide more details about this topic?",
                "What are the key takeaways from these documents?",
                "Are there any related concepts I should know about?"
            ]
        
        return suggestions[:3]  # Return max 3 suggestions

    def _clean_agent_thought_process(self, thought_process: str) -> str:
        """Clean up and format agent thought process text."""
        # Remove excessive whitespace and format for display
        cleaned = thought_process.strip()
        
        # Remove common CrewAI prefixes/suffixes
        prefixes_to_remove = [
            "I'll help you with that.",
            "Let me analyze",
            "I need to",
            "I will",
        ]
        
        for prefix in prefixes_to_remove:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
        
        # Limit length for readability
        if len(cleaned) > 300:
            cleaned = cleaned[:297] + "..."
        
        return cleaned
    
    def _parse_crew_result_string(self, result_str: str) -> List[Dict[str, Any]]:
        """Parse CrewAI result string to extract agent execution steps."""
        execution_steps: List[Dict[str, Any]] = []
        
        try:
            # Simple fallback: create steps based on detected agents or tasks
            lines = result_str.split('\n')
            current_step = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Look for agent-like patterns
                if any(keyword in line.lower() for keyword in ['analyzing', 'processing', 'determining', 'extracting']):
                    if current_step:
                        execution_steps.append(current_step)
                    
                    current_step = {
                        'agent_name': 'AI Assistant',
                        'agent_role': 'Processing',
                        'thought_process': line,
                        'timestamp': datetime.now(timezone.utc) - timedelta(seconds=len(execution_steps) * 2)
                    }
                elif current_step:
                    # Append to current step
                    current_step['thought_process'] += f"\n{line}"
            
            # Add the last step
            if current_step:
                execution_steps.append(current_step)
            
            # If no steps found, create a default one
            if not execution_steps:
                execution_steps.append({
                    'agent_name': 'AI Assistant',
                    'agent_role': 'General Assistant',
                    'thought_process': f"Processing your request: {result_str[:200]}...",
                    'timestamp': datetime.now(timezone.utc)
                })
                
        except Exception as e:
            logger.error(f"Error parsing crew result string: {e}")
            # Fallback step
            execution_steps = [{
                'agent_name': 'AI Assistant',
                'agent_role': 'General Assistant',
                'thought_process': "Processing your request...",
                'timestamp': datetime.now(timezone.utc)
            }]
        
        return execution_steps
    
    def _parse_crew_tasks_for_agent_steps(self, crew_result: Any) -> List[AgentStep]:
        """Parse crew result to extract agent steps from task outputs."""
        agent_steps = []
        
        try:
            # Try to extract from crew result tasks
            if hasattr(crew_result, 'tasks_output') and crew_result.tasks_output:
                for i, task_output in enumerate(crew_result.tasks_output):
                    try:
                        # Extract agent information from task
                        if hasattr(task_output, 'agent') and task_output.agent:
                            agent_name = getattr(task_output.agent, 'role', f'Agent {i+1}')
                            agent_role = getattr(task_output.agent, 'goal', 'Task Processing')
                        else:
                            agent_name = f'Agent {i+1}'
                            agent_role = 'Task Processing'
                        
                        # Extract thought process from task output
                        thought_process = "Processing task and generating output."
                        if hasattr(task_output, 'raw'):
                            thought_process = str(task_output.raw)[:300] + "..." if len(str(task_output.raw)) > 300 else str(task_output.raw)
                        elif hasattr(task_output, 'description'):
                            thought_process = str(task_output.description)[:300] + "..." if len(str(task_output.description)) > 300 else str(task_output.description)
                        
                        # Create agent step
                        step = AgentStep(
                            agent_name=agent_name,
                            agent_role=agent_role,
                            thought_process=self._clean_agent_thought_process(thought_process),
                            timestamp=datetime.now(timezone.utc) - timedelta(seconds=(len(crew_result.tasks_output) - i) * 2),
                            status="completed"
                        )
                        agent_steps.append(step)
                        
                    except Exception as e:
                        logger.warning(f"Error parsing task output {i}: {e}")
                        continue
            
            # If no task outputs or parsing failed, create basic steps
            if not agent_steps:
                basic_steps = [
                    AgentStep(
                        agent_name="Document Context Specialist",
                        agent_role="Context Analysis",
                        thought_process="Analyzed available documents and extracted relevant context for the user's query.",
                    timestamp=datetime.now(timezone.utc) - timedelta(seconds=4),
                    status="completed"
                    ),
                    AgentStep(
                        agent_name="AI Assistant",
                        agent_role="Response Generation",
                        thought_process="Generated a comprehensive response based on the context analysis and user requirements.",
                    timestamp=datetime.now(timezone.utc) - timedelta(seconds=2),
                    status="completed"
                    )
                ]
                agent_steps.extend(basic_steps)
                logger.info("Created basic agent steps as fallback")
            
        except Exception as e:
            logger.error(f"Error parsing crew tasks for agent steps: {e}")
            # Final fallback
            agent_steps = [
                AgentStep(
                    agent_name="AI Assistant",
                    agent_role="Task Processing",
                    thought_process="Successfully processed your request and generated a response.",
                    timestamp=datetime.now(timezone.utc),
                    status="completed"
                )
            ]
        
        return agent_steps
    
    def _extract_final_answer_from_result(self, result_str: str, crew_result: Any) -> str:
        """Extract the final answer from CrewAI result, removing JSON and system messages."""
        try:
            # Try to get the main result content
            if hasattr(crew_result, 'raw'):
                final_answer = str(crew_result.raw).strip()
            else:
                final_answer = result_str.strip()
            
            # Clean JSON from the final answer using the same cleaning logic
            final_answer = self._clean_json_from_response(final_answer)
            
            # Clean up the final answer
            lines = final_answer.split('\n')
            cleaned_lines = []
            
            for line in lines:
                line = line.strip()
                # Skip lines that look like agent headers or system messages
                if line and not any(skip_phrase in line.lower() for skip_phrase in [
                    'agent:', 'task:', 'crew:', 'executing:', 'analyzing:', 'final answer:'
                ]):
                    cleaned_lines.append(line)
            
            if cleaned_lines:
                final_answer = '\n'.join(cleaned_lines).strip()
            
            # Ensure we have some content
            if not final_answer or len(final_answer.strip()) < 10:
                final_answer = "I've processed your request. How else can I help you?"
            
            return final_answer
            
        except Exception as e:
            logger.error(f"Error extracting final answer: {e}")
            return "I've processed your request. How else can I help you?"
    
    def _clean_json_from_response(self, text: str) -> str:
        """Clean JSON blocks from response text, keeping only conversational content."""
        import re
        
        if not text:
            return ""
        
        # Remove JSON blocks (both ``` and plain JSON)
        json_patterns = [
            r'```json\s*\{.*?\}\s*```',  # Markdown JSON blocks
            r'```\s*\{.*?\}\s*```',      # Generic code blocks with JSON
            r'\{[^{}]*"[^"]*"[^{}]*\}',  # Simple JSON objects
            r'\[[^[\]]*\{.*?\}[^[\]]*\]' # JSON arrays
        ]
        
        for pattern in json_patterns:
            text = re.sub(pattern, '', text, flags=re.DOTALL | re.MULTILINE)
        
        # Remove empty lines and excessive whitespace
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        
        # Remove common filler phrases that might remain
        filler_phrases = [
            "I understand.",
            "Okay, I understand.",
            "I will wait for you to provide",
            "I'm here to help",
            "Let me help you with that"
        ]
        
        for phrase in filler_phrases:
            if phrase in text:
                text = text.replace(phrase, "").strip()
        
        return text.strip()

    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of the chat service."""
        uptime = (datetime.now(timezone.utc) - self.startup_time).total_seconds()
        
        return {
            "status": "healthy",
            "conversation_memory_status": "healthy" if self.memory_storage else "degraded",
            "enhanced_memory_status": "healthy" if self.memory_manager else "unavailable",
            "document_processing_status": "healthy",
            "active_conversations": len(self.active_conversations),
            "uptime_seconds": uptime,
            "last_check": datetime.now(timezone.utc)
        }

# Global service instance
_chat_service = None

def get_chat_service() -> ChatService:
    """Get or create the global chat service instance."""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service
