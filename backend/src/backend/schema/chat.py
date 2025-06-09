"""Pydantic models for chat functionality."""
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator
import uuid
from datetime import datetime
from enum import Enum

class MessageRole(str, Enum):
    """Enum for message roles."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ChatMessage(BaseModel):
    """Model representing a single chat message."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique message identifier")
    role: MessageRole = Field(..., description="Role of the message sender")
    content: str = Field(..., description="Message content", min_length=1, max_length=10000)
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional message metadata")

class DocumentSource(BaseModel):
    """Model representing a document source used in response."""
    document_path: str = Field(..., description="Path to the source document")
    relevance_score: float = Field(..., description="Relevance score for this document", ge=0.0, le=1.0)
    excerpt: Optional[str] = Field(None, description="Relevant excerpt from the document")
    page_number: Optional[int] = Field(None, description="Page number for PDF documents")

class AgentStep(BaseModel):
    """Model representing a single agent's thought process step."""
    agent_name: str = Field(..., description="Name of the agent")
    agent_role: str = Field(..., description="Role/specialty of the agent")
    thought_process: str = Field(..., description="The agent's thinking process and analysis")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When this step occurred")
    status: str = Field(default="completed", description="Status of this step: thinking, active, completed")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional agent step metadata")

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str = Field(..., description="User message", min_length=1, max_length=10000)
    conversation_id: Optional[str] = Field(None, description="Conversation identifier for memory")
    document_paths: Optional[List[str]] = Field(
        default_factory=list, 
        description="List of document paths to include in context"
    )
    max_documents: Optional[int] = Field(
        5, 
        description="Maximum number of documents to use for context", 
        ge=1, 
        le=20
    )
    include_sources: Optional[bool] = Field(
        True, 
        description="Whether to include source documents in response"
    )
    stream: Optional[bool] = Field(
        False, 
        description="Whether to stream the response"
    )
    temperature: Optional[float] = Field(
        0.7, 
        description="Response creativity level", 
        ge=0.0, 
        le=1.0
    )

    @field_validator('document_paths')
    @classmethod
    def validate_document_paths(cls, v):
        """Validate document paths for security."""
        if not v:
            return v
        
        for path in v:
            if not path:
                raise ValueError("Document path cannot be empty")
            
            # Prevent directory traversal attacks
            if '..' in path or path.startswith('/') or '\\' in path:
                raise ValueError(f"Invalid document path: {path} (directory traversal not allowed)")
                
        return v

class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    conversation_id: str = Field(..., description="Conversation identifier")
    message: ChatMessage = Field(..., description="Assistant response message")
    sources: Optional[List[DocumentSource]] = Field(
        default_factory=list, 
        description="Source documents used in response"
    )
    agent_process: Optional[List[AgentStep]] = Field(
        default_factory=list,
        description="Agent thought processes and collaboration steps"
    )
    processing_time_seconds: Optional[float] = Field(None, description="Time taken to process the request")
    token_usage: Optional[Dict[str, int]] = Field(None, description="Token usage statistics")
    follow_up_suggestions: Optional[List[str]] = Field(
        default_factory=list, 
        description="Suggested follow-up questions"
    )
    raw_crew_output: Optional[str] = Field(None, description="Raw CrewAI output for debugging")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()},
        "use_enum_values": True,
        "exclude_none": False  # Don't exclude None values
    }

class ChatStreamChunk(BaseModel):
    """Model for streaming chat response chunks."""
    conversation_id: str = Field(..., description="Conversation identifier")
    chunk_type: str = Field(..., description="Type of chunk: 'content', 'sources', 'complete'")
    content: Optional[str] = Field(None, description="Content chunk for streaming")
    sources: Optional[List[DocumentSource]] = Field(None, description="Sources when chunk_type is 'sources'")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional chunk metadata")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Chunk timestamp")

class ChatErrorResponse(BaseModel):
    """Response model for chat errors."""
    conversation_id: Optional[str] = Field(None, description="Conversation identifier if available")
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[str] = Field(None, description="Additional error details")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retrying")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    
    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()},
        "use_enum_values": True
    }

class ConversationSummary(BaseModel):
    """Model for conversation summary."""
    conversation_id: str = Field(..., description="Conversation identifier")
    message_count: int = Field(..., description="Number of messages in conversation")
    start_time: datetime = Field(..., description="Conversation start time")
    last_activity: datetime = Field(..., description="Last message timestamp")
    summary: Optional[str] = Field(None, description="Conversation summary")
    topics: List[str] = Field(default_factory=list, description="Main topics discussed")

class ChatHealth(BaseModel):
    """Model for chat service health check."""
    status: str = Field(..., description="Service status")
    conversation_memory_status: str = Field(..., description="Memory system status")
    document_processing_status: str = Field(..., description="Document processing status")
    active_conversations: int = Field(..., description="Number of active conversations")
    uptime_seconds: float = Field(..., description="Service uptime in seconds")
    last_check: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
