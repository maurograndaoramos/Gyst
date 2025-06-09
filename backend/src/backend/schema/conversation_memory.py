"""Enhanced conversation memory models for advanced context management."""
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator
import uuid
from datetime import datetime, timedelta
from enum import Enum

class DecayType(str, Enum):
    """Types of relevance decay."""
    TEMPORAL = "temporal"
    POSITIONAL = "positional"
    SEMANTIC = "semantic"
    COMBINED = "combined"

class TopicChangeType(str, Enum):
    """Types of topic changes in conversation."""
    GRADUAL = "gradual"
    ABRUPT = "abrupt"
    RETURN = "return"
    NEW = "new"

class MemoryPriority(str, Enum):
    """Priority levels for memory retention."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    ARCHIVE = "archive"

class ConversationMemoryConfig(BaseModel):
    """Configuration for conversation memory management."""
    max_context_tokens: int = Field(32000, description="Maximum tokens in context window")
    relevance_decay_factor: float = Field(0.95, description="Exponential decay factor for message relevance", ge=0.1, le=1.0)
    summary_threshold: int = Field(20, description="Number of messages before summarization", ge=5, le=100)
    topic_similarity_threshold: float = Field(0.7, description="Threshold for topic similarity", ge=0.1, le=1.0)
    memory_compression_ratio: float = Field(0.3, description="Target compression ratio for summaries", ge=0.1, le=0.8)
    temporal_decay_hours: float = Field(24.0, description="Half-life for temporal decay in hours", ge=1.0)
    max_conversation_length: int = Field(1000, description="Maximum messages before archival", ge=100)
    enable_background_processing: bool = Field(True, description="Enable background summary generation")
    
    @field_validator('relevance_decay_factor')
    @classmethod
    def validate_decay_factor(cls, v):
        if not 0.1 <= v <= 1.0:
            raise ValueError("Decay factor must be between 0.1 and 1.0")
        return v

class ConversationTopic(BaseModel):
    """Model for tracking conversation topics."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique topic identifier")
    name: str = Field(..., description="Topic name or description")
    keywords: List[str] = Field(default_factory=list, description="Key terms associated with topic")
    relevance_score: float = Field(1.0, description="Current relevance score", ge=0.0, le=1.0)
    confidence_score: float = Field(1.0, description="Confidence in topic identification", ge=0.0, le=1.0)
    first_mention: datetime = Field(default_factory=datetime.utcnow, description="When topic first appeared")
    last_mention: datetime = Field(default_factory=datetime.utcnow, description="Most recent mention")
    message_count: int = Field(1, description="Number of messages related to this topic", ge=0)
    embedding: Optional[List[float]] = Field(None, description="Topic embedding vector")
    parent_topic_id: Optional[str] = Field(None, description="Parent topic for hierarchical organization")
    subtopic_ids: List[str] = Field(default_factory=list, description="Child topic IDs")

class MessageRelevance(BaseModel):
    """Model for tracking message relevance and decay."""
    message_id: str = Field(..., description="Reference to chat message ID")
    base_relevance: float = Field(1.0, description="Initial relevance score", ge=0.0, le=1.0)
    current_relevance: float = Field(1.0, description="Current relevance after decay", ge=0.0, le=1.0)
    decay_factor: float = Field(1.0, description="Applied decay factor", ge=0.0, le=1.0)
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last relevance update")
    topic_relevance: Dict[str, float] = Field(default_factory=dict, description="Relevance to specific topics")
    priority: MemoryPriority = Field(MemoryPriority.MEDIUM, description="Memory retention priority")
    access_count: int = Field(0, description="Number of times accessed", ge=0)
    last_accessed: Optional[datetime] = Field(None, description="Last access timestamp")
    
class ConversationSummary(BaseModel):
    """Model for conversation summaries at different granularities."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique summary identifier")
    conversation_id: str = Field(..., description="Associated conversation ID")
    summary_type: str = Field(..., description="Type of summary (turn, topic, session, etc.)")
    content: str = Field(..., description="Summary content")
    key_points: List[str] = Field(default_factory=list, description="Extracted key points")
    covered_messages: List[str] = Field(default_factory=list, description="Message IDs covered by summary")
    covered_topics: List[str] = Field(default_factory=list, description="Topic IDs covered by summary")
    compression_ratio: float = Field(..., description="Achieved compression ratio", ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Summary creation timestamp")
    token_count: int = Field(..., description="Number of tokens in summary", ge=0)
    original_token_count: int = Field(..., description="Original token count before compression", ge=0)
    relevance_score: float = Field(1.0, description="Overall relevance of summary", ge=0.0, le=1.0)

class TopicTransition(BaseModel):
    """Model for tracking topic changes in conversation."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique transition identifier")
    conversation_id: str = Field(..., description="Associated conversation ID")
    from_topic_id: Optional[str] = Field(None, description="Previous topic ID")
    to_topic_id: str = Field(..., description="New topic ID")
    transition_type: TopicChangeType = Field(..., description="Type of topic change")
    message_id: str = Field(..., description="Message where transition occurred")
    confidence: float = Field(..., description="Confidence in transition detection", ge=0.0, le=1.0)
    similarity_score: float = Field(..., description="Similarity between topics", ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Transition timestamp")
    bridging_context: Optional[str] = Field(None, description="Context that bridges topics")

class ContextWindow(BaseModel):
    """Model for managing conversation context window."""
    conversation_id: str = Field(..., description="Associated conversation ID")
    active_messages: List[str] = Field(default_factory=list, description="Currently active message IDs")
    archived_messages: List[str] = Field(default_factory=list, description="Archived message IDs")
    active_summaries: List[str] = Field(default_factory=list, description="Active summary IDs")
    current_token_count: int = Field(0, description="Current token usage", ge=0)
    max_token_limit: int = Field(32000, description="Maximum allowed tokens", ge=1000)
    pruning_threshold: float = Field(0.8, description="Threshold for context pruning", ge=0.5, le=1.0)
    last_pruned: Optional[datetime] = Field(None, description="Last pruning timestamp")
    compression_count: int = Field(0, description="Number of compressions performed", ge=0)

class ConversationState(BaseModel):
    """Enhanced conversation state with advanced tracking."""
    conversation_id: str = Field(..., description="Unique conversation identifier")
    current_topic_id: Optional[str] = Field(None, description="Current active topic")
    previous_topic_id: Optional[str] = Field(None, description="Previous topic for context")
    topic_history: List[str] = Field(default_factory=list, description="Historical topic sequence")
    message_count: int = Field(0, description="Total message count", ge=0)
    turn_count: int = Field(0, description="Conversation turn count", ge=0)
    session_start: datetime = Field(default_factory=datetime.utcnow, description="Session start time")
    last_activity: datetime = Field(default_factory=datetime.utcnow, description="Last activity timestamp")
    context_window: ContextWindow = Field(..., description="Context window management")
    memory_config: ConversationMemoryConfig = Field(default_factory=ConversationMemoryConfig, description="Memory configuration")
    is_archived: bool = Field(False, description="Whether conversation is archived")
    archive_reason: Optional[str] = Field(None, description="Reason for archival")

class MemoryMetrics(BaseModel):
    """Metrics for monitoring memory system performance."""
    conversation_id: str = Field(..., description="Associated conversation ID")
    total_messages: int = Field(0, description="Total messages processed", ge=0)
    active_messages: int = Field(0, description="Currently active messages", ge=0)
    archived_messages: int = Field(0, description="Archived messages", ge=0)
    total_summaries: int = Field(0, description="Total summaries generated", ge=0)
    compression_ratio: float = Field(0.0, description="Overall compression ratio", ge=0.0, le=1.0)
    avg_relevance_score: float = Field(0.0, description="Average relevance score", ge=0.0, le=1.0)
    topics_identified: int = Field(0, description="Total topics identified", ge=0)
    topic_transitions: int = Field(0, description="Number of topic transitions", ge=0)
    memory_efficiency: float = Field(0.0, description="Memory usage efficiency", ge=0.0, le=1.0)
    processing_time_ms: float = Field(0.0, description="Average processing time in ms", ge=0.0)
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last metrics update")

class ConversationArchive(BaseModel):
    """Model for archived conversation data."""
    conversation_id: str = Field(..., description="Original conversation ID")
    archive_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Archive identifier")
    final_summary: str = Field(..., description="Final conversation summary")
    key_topics: List[ConversationTopic] = Field(default_factory=list, description="Key topics discussed")
    important_messages: List[str] = Field(default_factory=list, description="Important message IDs preserved")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Archive metadata")
    archived_at: datetime = Field(default_factory=datetime.utcnow, description="Archive timestamp")
    archive_size_bytes: int = Field(0, description="Archive size in bytes", ge=0)
    retrieval_embedding: Optional[List[float]] = Field(None, description="Embedding for archive retrieval")
