"""Advanced conversation memory manager for CrewAI with intelligent context management."""
import os
import logging
import asyncio
import time
import json
import math
from typing import List, Dict, Any, Optional, Tuple, Set
from pathlib import Path
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
import sqlite3
from threading import Lock

import tiktoken
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai

from ...schema.chat import ChatMessage, MessageRole
from ...schema.conversation_memory import (
    ConversationMemoryConfig, ConversationTopic, MessageRelevance,
    ConversationSummary, TopicTransition, ContextWindow, ConversationState,
    MemoryMetrics, ConversationArchive, DecayType, TopicChangeType,
    MemoryPriority
)
from ..config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

class ConversationMemoryManager:
    """Advanced conversation memory manager with intelligent context management."""
    
    def __init__(self, storage_path: Optional[str] = None, config: Optional[ConversationMemoryConfig] = None):
        """Initialize the conversation memory manager."""
        self.settings = get_settings()
        self.config = config or ConversationMemoryConfig()
        
        # Configure storage
        self.storage_path = Path(storage_path or self.settings.upload_base_dir) / "conversation_memory"
        self.storage_path.mkdir(mode=0o700, parents=True, exist_ok=True)
        
        # Initialize database
        self.db_path = self.storage_path / "conversation_memory.db"
        self._init_database()
        
        # In-memory caches
        self._conversation_states: Dict[str, ConversationState] = {}
        self._message_relevance: Dict[str, MessageRelevance] = {}
        self._topics: Dict[str, ConversationTopic] = {}
        self._summaries: Dict[str, ConversationSummary] = {}
        
        # Thread safety
        self._lock = Lock()
        self._executor = ThreadPoolExecutor(max_workers=4)
        
        # Token encoder for context window management
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception as e:
            logger.warning(f"Could not load tiktoken encoder: {e}")
            self.tokenizer = None
        
        # Configure Gemini for embeddings and summarization
        if self.settings.gemini_api_key:
            genai.configure(api_key=self.settings.gemini_api_key)
        
        logger.info(f"Conversation memory manager initialized at {self.storage_path}")
    
    def _init_database(self):
        """Initialize SQLite database schema."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Conversation states table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversation_states (
                    conversation_id TEXT PRIMARY KEY,
                    current_topic_id TEXT,
                    previous_topic_id TEXT,
                    topic_history TEXT,
                    message_count INTEGER DEFAULT 0,
                    turn_count INTEGER DEFAULT 0,
                    session_start TIMESTAMP,
                    last_activity TIMESTAMP,
                    context_window TEXT,
                    memory_config TEXT,
                    is_archived BOOLEAN DEFAULT FALSE,
                    archive_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Message relevance table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS message_relevance (
                    message_id TEXT PRIMARY KEY,
                    conversation_id TEXT,
                    base_relevance REAL DEFAULT 1.0,
                    current_relevance REAL DEFAULT 1.0,
                    decay_factor REAL DEFAULT 1.0,
                    last_updated TIMESTAMP,
                    topic_relevance TEXT,
                    priority TEXT DEFAULT 'medium',
                    access_count INTEGER DEFAULT 0,
                    last_accessed TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversation_states(conversation_id)
                )
            """)
            
            # Topics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS topics (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT,
                    name TEXT NOT NULL,
                    keywords TEXT,
                    relevance_score REAL DEFAULT 1.0,
                    confidence_score REAL DEFAULT 1.0,
                    first_mention TIMESTAMP,
                    last_mention TIMESTAMP,
                    message_count INTEGER DEFAULT 1,
                    embedding TEXT,
                    parent_topic_id TEXT,
                    subtopic_ids TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversation_states(conversation_id)
                )
            """)
            
            # Summaries table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS summaries (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT,
                    summary_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    key_points TEXT,
                    covered_messages TEXT,
                    covered_topics TEXT,
                    compression_ratio REAL,
                    token_count INTEGER,
                    original_token_count INTEGER,
                    relevance_score REAL DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversation_states(conversation_id)
                )
            """)
            
            # Topic transitions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS topic_transitions (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT,
                    from_topic_id TEXT,
                    to_topic_id TEXT NOT NULL,
                    transition_type TEXT NOT NULL,
                    message_id TEXT NOT NULL,
                    confidence REAL,
                    similarity_score REAL,
                    bridging_context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversation_states(conversation_id)
                )
            """)
            
            # Memory metrics table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memory_metrics (
                    conversation_id TEXT PRIMARY KEY,
                    total_messages INTEGER DEFAULT 0,
                    active_messages INTEGER DEFAULT 0,
                    archived_messages INTEGER DEFAULT 0,
                    total_summaries INTEGER DEFAULT 0,
                    compression_ratio REAL DEFAULT 0.0,
                    avg_relevance_score REAL DEFAULT 0.0,
                    topics_identified INTEGER DEFAULT 0,
                    topic_transitions INTEGER DEFAULT 0,
                    memory_efficiency REAL DEFAULT 0.0,
                    processing_time_ms REAL DEFAULT 0.0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversation_states(conversation_id)
                )
            """)
            
            # Create indexes for performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_message_relevance_conversation ON message_relevance(conversation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_conversation ON topics(conversation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_summaries_conversation ON summaries(conversation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transitions_conversation ON topic_transitions(conversation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_message_relevance_updated ON message_relevance(last_updated)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_topics_last_mention ON topics(last_mention)")
            
            conn.commit()
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        else:
            # Fallback estimation: roughly 4 characters per token
            return len(text) // 4
    
    async def _get_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using Gemini."""
        try:
            if not self.settings.gemini_api_key:
                return None
            
            # Use Gemini's text embedding model
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="semantic_similarity"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    async def initialize_conversation(self, conversation_id: str, config: Optional[ConversationMemoryConfig] = None) -> ConversationState:
        """Initialize a new conversation with memory management."""
        memory_config = config or self.config
        
        # Create context window
        context_window = ContextWindow(
            conversation_id=conversation_id,
            max_token_limit=memory_config.max_context_tokens,
            pruning_threshold=0.8
        )
        
        # Create conversation state
        state = ConversationState(
            conversation_id=conversation_id,
            context_window=context_window,
            memory_config=memory_config
        )
        
        # Store in database
        await self._save_conversation_state(state)
        
        # Cache in memory
        with self._lock:
            self._conversation_states[conversation_id] = state
        
        # Initialize metrics
        metrics = MemoryMetrics(conversation_id=conversation_id)
        await self._save_memory_metrics(metrics)
        
        logger.info(f"Initialized conversation memory for {conversation_id}")
        return state
    
    async def add_message(self, conversation_id: str, message: ChatMessage) -> None:
        """Add a new message to conversation memory."""
        start_time = time.time()
        
        # Get or create conversation state
        state = await self.get_conversation_state(conversation_id)
        if not state:
            state = await self.initialize_conversation(conversation_id)
        
        # Create message relevance record
        relevance = MessageRelevance(
            message_id=message.id,
            base_relevance=1.0,
            current_relevance=1.0,
            priority=MemoryPriority.HIGH if message.role == MessageRole.USER else MemoryPriority.MEDIUM
        )
        
        # Store message relevance
        await self._save_message_relevance(conversation_id, relevance)
        
        # Update conversation state
        state.message_count += 1
        if message.role == MessageRole.USER:
            state.turn_count += 1
        state.last_activity = datetime.now(timezone.utc)
        
        # Add to context window
        state.context_window.active_messages.append(message.id)
        state.context_window.current_token_count += self._count_tokens(message.content)
        
        # Extract and track topics
        await self._extract_and_track_topics(conversation_id, message)
        
        # Check if context window needs management
        if state.context_window.current_token_count > state.context_window.max_token_limit * state.context_window.pruning_threshold:
            await self._manage_context_window(conversation_id)
        
        # Check if summarization is needed
        if state.message_count % state.memory_config.summary_threshold == 0:
            if state.memory_config.enable_background_processing:
                # Schedule background summarization
                asyncio.create_task(self._generate_conversation_summary(conversation_id))
            else:
                await self._generate_conversation_summary(conversation_id)
        
        # Update state
        await self._save_conversation_state(state)
        
        # Update metrics
        processing_time = (time.time() - start_time) * 1000
        await self._update_memory_metrics(conversation_id, processing_time)
        
        logger.debug(f"Added message {message.id} to conversation {conversation_id}")
    
    async def _extract_and_track_topics(self, conversation_id: str, message: ChatMessage) -> None:
        """Extract topics from message and track topic changes."""
        try:
            # Generate embedding for message
            embedding = await self._get_embedding(message.content)
            if not embedding:
                return
            
            # Simple topic extraction using keywords (in production, use more sophisticated NLP)
            keywords = self._extract_keywords(message.content)
            if not keywords:
                return
            
            topic_name = " ".join(keywords[:3])  # Use first 3 keywords as topic name
            
            # Check for existing similar topics
            existing_topics = await self._get_topics_for_conversation(conversation_id)
            similar_topic = await self._find_similar_topic(embedding, existing_topics)
            
            state = await self.get_conversation_state(conversation_id)
            
            if similar_topic and similar_topic.confidence_score > self.config.topic_similarity_threshold:
                # Update existing topic
                similar_topic.last_mention = datetime.now(timezone.utc)
                similar_topic.message_count += 1
                similar_topic.keywords.extend([k for k in keywords if k not in similar_topic.keywords])
                await self._save_topic(conversation_id, similar_topic)
                
                # Check for topic transition
                if state and state.current_topic_id != similar_topic.id:
                    await self._record_topic_transition(
                        conversation_id, 
                        state.current_topic_id, 
                        similar_topic.id, 
                        message.id
                    )
                    state.previous_topic_id = state.current_topic_id
                    state.current_topic_id = similar_topic.id
                    if similar_topic.id not in state.topic_history:
                        state.topic_history.append(similar_topic.id)
            else:
                # Create new topic
                new_topic = ConversationTopic(
                    name=topic_name,
                    keywords=keywords,
                    embedding=embedding,
                    confidence_score=0.8
                )
                await self._save_topic(conversation_id, new_topic)
                
                # Record topic transition
                if state:
                    await self._record_topic_transition(
                        conversation_id,
                        state.current_topic_id,
                        new_topic.id,
                        message.id,
                        TopicChangeType.NEW
                    )
                    state.previous_topic_id = state.current_topic_id
                    state.current_topic_id = new_topic.id
                    state.topic_history.append(new_topic.id)
            
            if state:
                await self._save_conversation_state(state)
                
        except Exception as e:
            logger.error(f"Failed to extract and track topics: {e}")
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text (simplified implementation)."""
        # In production, use more sophisticated NLP libraries like spaCy or NLTK
        import re
        
        # Remove common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'this', 'that', 'these', 'those'
        }
        
        # Extract words and filter
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        keywords = [word for word in words if word not in stop_words]
        
        # Return most frequent keywords
        from collections import Counter
        counter = Counter(keywords)
        return [word for word, count in counter.most_common(10)]
    
    async def _find_similar_topic(self, embedding: List[float], topics: List[ConversationTopic]) -> Optional[ConversationTopic]:
        """Find the most similar existing topic."""
        if not topics or not embedding:
            return None
        
        best_topic = None
        best_similarity = 0.0
        
        for topic in topics:
            if topic.embedding:
                similarity = cosine_similarity([embedding], [topic.embedding])[0][0]
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_topic = topic
        
        if best_topic and best_similarity > self.config.topic_similarity_threshold:
            return best_topic
        
        return None
    
    async def _record_topic_transition(
        self, 
        conversation_id: str, 
        from_topic_id: Optional[str], 
        to_topic_id: str, 
        message_id: str,
        transition_type: TopicChangeType = TopicChangeType.GRADUAL
    ) -> None:
        """Record a topic transition."""
        transition = TopicTransition(
            conversation_id=conversation_id,
            from_topic_id=from_topic_id,
            to_topic_id=to_topic_id,
            transition_type=transition_type,
            message_id=message_id,
            confidence=0.8,
            similarity_score=0.0  # Calculate based on topic similarity
        )
        
        await self._save_topic_transition(transition)
    
    async def _manage_context_window(self, conversation_id: str) -> None:
        """Manage context window when approaching token limits."""
        state = await self.get_conversation_state(conversation_id)
        if not state:
            return
        
        # Apply relevance decay to all messages
        await self._apply_relevance_decay(conversation_id)
        
        # Get current message relevances
        message_relevances = await self._get_message_relevances_for_conversation(conversation_id)
        
        # Sort by relevance score (lowest first for pruning)
        sorted_relevances = sorted(message_relevances, key=lambda x: x.current_relevance)
        
        # Calculate target token reduction
        current_tokens = state.context_window.current_token_count
        target_tokens = int(state.context_window.max_token_limit * 0.7)  # Reduce to 70% capacity
        tokens_to_remove = current_tokens - target_tokens
        
        # Prune low-relevance messages
        removed_tokens = 0
        messages_to_archive = []
        
        for relevance in sorted_relevances:
            if removed_tokens >= tokens_to_remove:
                break
            
            if relevance.priority not in [MemoryPriority.CRITICAL, MemoryPriority.HIGH]:
                # Estimate token count for this message (simplified)
                estimated_tokens = 50  # Average message size
                messages_to_archive.append(relevance.message_id)
                removed_tokens += estimated_tokens
        
        # Move messages to archive
        for message_id in messages_to_archive:
            if message_id in state.context_window.active_messages:
                state.context_window.active_messages.remove(message_id)
                state.context_window.archived_messages.append(message_id)
        
        # Update token count
        state.context_window.current_token_count -= removed_tokens
        state.context_window.last_pruned = datetime.now(timezone.utc)
        state.context_window.compression_count += 1
        
        await self._save_conversation_state(state)
        
        logger.info(f"Pruned {len(messages_to_archive)} messages from conversation {conversation_id}")
    
    async def _apply_relevance_decay(self, conversation_id: str, decay_type: DecayType = DecayType.COMBINED) -> None:
        """Apply relevance decay to conversation messages."""
        message_relevances = await self._get_message_relevances_for_conversation(conversation_id)
        now = datetime.now(timezone.utc)
        
        for relevance in message_relevances:
            original_relevance = relevance.current_relevance
            
            if decay_type in [DecayType.TEMPORAL, DecayType.COMBINED]:
                # Temporal decay based on time elapsed
                time_diff = (now - relevance.last_updated).total_seconds() / 3600  # hours
                temporal_decay = math.exp(-time_diff / self.config.temporal_decay_hours)
                relevance.current_relevance *= temporal_decay
            
            if decay_type in [DecayType.POSITIONAL, DecayType.COMBINED]:
                # Positional decay based on message position (simplified)
                positional_decay = self.config.relevance_decay_factor
                relevance.current_relevance *= positional_decay
            
            # Update decay factor
            relevance.decay_factor = relevance.current_relevance / relevance.base_relevance
            relevance.last_updated = now
            
            # Save updated relevance
            await self._save_message_relevance(conversation_id, relevance)
        
        logger.debug(f"Applied {decay_type.value} decay to {len(message_relevances)} messages")
    
    async def _generate_conversation_summary(self, conversation_id: str) -> Optional[ConversationSummary]:
        """Generate a conversation summary."""
        try:
            # Get recent messages for summarization
            state = await self.get_conversation_state(conversation_id)
            if not state:
                return None
            
            # Get messages from context window
            recent_message_ids = state.context_window.active_messages[-self.config.summary_threshold:]
            
            # This is a simplified implementation - in production, retrieve actual message content
            # and use Gemini to generate intelligent summaries
            summary_content = f"Summary of {len(recent_message_ids)} recent messages in conversation {conversation_id}"
            
            # Create summary
            summary = ConversationSummary(
                conversation_id=conversation_id,
                summary_type="periodic",
                content=summary_content,
                covered_messages=recent_message_ids,
                compression_ratio=self.config.memory_compression_ratio,
                token_count=self._count_tokens(summary_content),
                original_token_count=len(recent_message_ids) * 100  # Estimated
            )
            
            await self._save_summary(summary)
            
            # Add summary to context window
            state.context_window.active_summaries.append(summary.id)
            await self._save_conversation_state(state)
            
            logger.info(f"Generated summary {summary.id} for conversation {conversation_id}")
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate conversation summary: {e}")
            return None
    
    async def get_conversation_state(self, conversation_id: str) -> Optional[ConversationState]:
        """Get conversation state."""
        # Check cache first
        with self._lock:
            if conversation_id in self._conversation_states:
                return self._conversation_states[conversation_id]
        
        # Load from database
        state = await self._load_conversation_state(conversation_id)
        if state:
            with self._lock:
                self._conversation_states[conversation_id] = state
        
        return state
    
    async def get_relevant_context(self, conversation_id: str, query: str, max_tokens: int = 8000) -> Dict[str, Any]:
        """Get relevant conversation context for a query."""
        state = await self.get_conversation_state(conversation_id)
        if not state:
            return {"messages": [], "topics": [], "summaries": []}
        
        # Generate query embedding for relevance matching
        query_embedding = await self._get_embedding(query)
        
        # Get relevant messages based on current relevance scores
        message_relevances = await self._get_message_relevances_for_conversation(conversation_id)
        relevant_messages = sorted(
            [r for r in message_relevances if r.current_relevance > 0.3],
            key=lambda x: x.current_relevance,
            reverse=True
        )
        
        # Get relevant topics
        topics = await self._get_topics_for_conversation(conversation_id)
        relevant_topics = []
        
        if query_embedding:
            for topic in topics:
                if topic.embedding:
                    similarity = cosine_similarity([query_embedding], [topic.embedding])[0][0]
                    if similarity > 0.5:
                        relevant_topics.append((topic, similarity))
            
            relevant_topics = sorted(relevant_topics, key=lambda x: x[1], reverse=True)
            relevant_topics = [topic for topic, _ in relevant_topics[:5]]
        
        # Get relevant summaries
        summaries = await self._get_summaries_for_conversation(conversation_id)
        relevant_summaries = sorted(summaries, key=lambda x: x.relevance_score, reverse=True)[:3]
        
        return {
            "messages": [r.message_id for r in relevant_messages[:20]],
            "topics": relevant_topics,
            "summaries": relevant_summaries,
            "context_window": state.context_window,
            "current_topic": state.current_topic_id
        }
    
    # Database operations
    async def _save_conversation_state(self, state: ConversationState) -> None:
        """Save conversation state to database."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO conversation_states (
                        conversation_id, current_topic_id, previous_topic_id, topic_history,
                        message_count, turn_count, session_start, last_activity,
                        context_window, memory_config, is_archived, archive_reason, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    state.conversation_id,
                    state.current_topic_id,
                    state.previous_topic_id,
                    json.dumps(state.topic_history),
                    state.message_count,
                    state.turn_count,
                    state.session_start.isoformat(),
                    state.last_activity.isoformat(),
                    state.context_window.model_dump_json(),
                    state.memory_config.model_dump_json(),
                    state.is_archived,
                    state.archive_reason,
                    datetime.now(timezone.utc).isoformat()
                ))
                conn.commit()
        
        await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _load_conversation_state(self, conversation_id: str) -> Optional[ConversationState]:
        """Load conversation state from database."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT current_topic_id, previous_topic_id, topic_history, message_count,
                           turn_count, session_start, last_activity, context_window,
                           memory_config, is_archived, archive_reason
                    FROM conversation_states WHERE conversation_id = ?
                """, (conversation_id,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                try:
                    context_window_data = json.loads(row[7])
                    memory_config_data = json.loads(row[8])
                    
                    return ConversationState(
                        conversation_id=conversation_id,
                        current_topic_id=row[0],
                        previous_topic_id=row[1],
                        topic_history=json.loads(row[2]) if row[2] else [],
                        message_count=row[3],
                        turn_count=row[4],
                        session_start=datetime.fromisoformat(row[5]),
                        last_activity=datetime.fromisoformat(row[6]),
                        context_window=ContextWindow(**context_window_data),
                        memory_config=ConversationMemoryConfig(**memory_config_data),
                        is_archived=bool(row[9]),
                        archive_reason=row[10]
                    )
                except Exception as e:
                    logger.error(f"Failed to deserialize conversation state: {e}")
                    return None
        
        return await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _save_message_relevance(self, conversation_id: str, relevance: MessageRelevance) -> None:
        """Save message relevance to database."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO message_relevance (
                        message_id, conversation_id, base_relevance, current_relevance,
                        decay_factor, last_updated, topic_relevance, priority,
                        access_count, last_accessed
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    relevance.message_id,
                    conversation_id,
                    relevance.base_relevance,
                    relevance.current_relevance,
                    relevance.decay_factor,
                    relevance.last_updated.isoformat(),
                    json.dumps(relevance.topic_relevance),
                    relevance.priority.value,
                    relevance.access_count,
                    relevance.last_accessed.isoformat() if relevance.last_accessed else None
                ))
                conn.commit()
        
        await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _get_message_relevances_for_conversation(self, conversation_id: str) -> List[MessageRelevance]:
        """Get all message relevances for a conversation."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT message_id, base_relevance, current_relevance, decay_factor,
                           last_updated, topic_relevance, priority, access_count, last_accessed
                    FROM message_relevance WHERE conversation_id = ?
                    ORDER BY last_updated DESC
                """, (conversation_id,))
                
                relevances = []
                for row in cursor.fetchall():
                    try:
                        relevances.append(MessageRelevance(
                            message_id=row[0],
                            base_relevance=row[1],
                            current_relevance=row[2],
                            decay_factor=row[3],
                            last_updated=datetime.fromisoformat(row[4]),
                            topic_relevance=json.loads(row[5]) if row[5] else {},
                            priority=MemoryPriority(row[6]),
                            access_count=row[7],
                            last_accessed=datetime.fromisoformat(row[8]) if row[8] else None
                        ))
                    except Exception as e:
                        logger.error(f"Failed to deserialize message relevance: {e}")
                        continue
                
                return relevances
        
        return await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _save_topic(self, conversation_id: str, topic: ConversationTopic) -> None:
        """Save topic to database."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO topics (
                        id, conversation_id, name, keywords, relevance_score,
                        confidence_score, first_mention, last_mention, message_count,
                        embedding, parent_topic_id, subtopic_ids
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    topic.id,
                    conversation_id,
                    topic.name,
                    json.dumps(topic.keywords),
                    topic.relevance_score,
                    topic.confidence_score,
                    topic.first_mention.isoformat(),
                    topic.last_mention.isoformat(),
                    topic.message_count,
                    json.dumps(topic.embedding) if topic.embedding else None,
                    topic.parent_topic_id,
                    json.dumps(topic.subtopic_ids)
                ))
                conn.commit()
        
        await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _get_topics_for_conversation(self, conversation_id: str) -> List[ConversationTopic]:
        """Get all topics for a conversation."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, name, keywords, relevance_score, confidence_score,
                           first_mention, last_mention, message_count, embedding,
                           parent_topic_id, subtopic_ids
                    FROM topics WHERE conversation_id = ?
                    ORDER BY last_mention DESC
                """, (conversation_id,))
                
                topics = []
                for row in cursor.fetchall():
                    try:
                        topics.append(ConversationTopic(
                            id=row[0],
                            name=row[1],
                            keywords=json.loads(row[2]) if row[2] else [],
                            relevance_score=row[3],
                            confidence_score=row[4],
                            first_mention=datetime.fromisoformat(row[5]),
                            last_mention=datetime.fromisoformat(row[6]),
                            message_count=row[7],
                            embedding=json.loads(row[8]) if row[8] else None,
                            parent_topic_id=row[9],
                            subtopic_ids=json.loads(row[10]) if row[10] else []
                        ))
                    except Exception as e:
                        logger.error(f"Failed to deserialize topic: {e}")
                        continue
                
                return topics
        
        return await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _save_topic_transition(self, transition: TopicTransition) -> None:
        """Save topic transition to database."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO topic_transitions (
                        id, conversation_id, from_topic_id, to_topic_id,
                        transition_type, message_id, confidence, similarity_score,
                        bridging_context, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    transition.id,
                    transition.conversation_id,
                    transition.from_topic_id,
                    transition.to_topic_id,
                    transition.transition_type.value,
                    transition.message_id,
                    transition.confidence,
                    transition.similarity_score,
                    transition.bridging_context,
                    transition.created_at.isoformat()
                ))
                conn.commit()
        
        await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _save_summary(self, summary: ConversationSummary) -> None:
        """Save summary to database."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO summaries (
                        id, conversation_id, summary_type, content, key_points,
                        covered_messages, covered_topics, compression_ratio,
                        token_count, original_token_count, relevance_score, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    summary.id,
                    summary.conversation_id,
                    summary.summary_type,
                    summary.content,
                    json.dumps(summary.key_points),
                    json.dumps(summary.covered_messages),
                    json.dumps(summary.covered_topics),
                    summary.compression_ratio,
                    summary.token_count,
                    summary.original_token_count,
                    summary.relevance_score,
                    summary.created_at.isoformat()
                ))
                conn.commit()
        
        await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _get_summaries_for_conversation(self, conversation_id: str) -> List[ConversationSummary]:
        """Get all summaries for a conversation."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, summary_type, content, key_points, covered_messages,
                           covered_topics, compression_ratio, token_count,
                           original_token_count, relevance_score, created_at
                    FROM summaries WHERE conversation_id = ?
                    ORDER BY created_at DESC
                """, (conversation_id,))
                
                summaries = []
                for row in cursor.fetchall():
                    try:
                        summaries.append(ConversationSummary(
                            id=row[0],
                            conversation_id=conversation_id,
                            summary_type=row[1],
                            content=row[2],
                            key_points=json.loads(row[3]) if row[3] else [],
                            covered_messages=json.loads(row[4]) if row[4] else [],
                            covered_topics=json.loads(row[5]) if row[5] else [],
                            compression_ratio=row[6],
                            token_count=row[7],
                            original_token_count=row[8],
                            relevance_score=row[9],
                            created_at=datetime.fromisoformat(row[10])
                        ))
                    except Exception as e:
                        logger.error(f"Failed to deserialize summary: {e}")
                        continue
                
                return summaries
        
        return await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _save_memory_metrics(self, metrics: MemoryMetrics) -> None:
        """Save memory metrics to database."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO memory_metrics (
                        conversation_id, total_messages, active_messages,
                        archived_messages, total_summaries, compression_ratio,
                        avg_relevance_score, topics_identified, topic_transitions,
                        memory_efficiency, processing_time_ms, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    metrics.conversation_id,
                    metrics.total_messages,
                    metrics.active_messages,
                    metrics.archived_messages,
                    metrics.total_summaries,
                    metrics.compression_ratio,
                    metrics.avg_relevance_score,
                    metrics.topics_identified,
                    metrics.topic_transitions,
                    metrics.memory_efficiency,
                    metrics.processing_time_ms,
                    metrics.last_updated.isoformat()
                ))
                conn.commit()
        
        await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)
    
    async def _update_memory_metrics(self, conversation_id: str, processing_time: float) -> None:
        """Update memory metrics."""
        def _db_operation():
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get current metrics
                cursor.execute("""
                    SELECT total_messages, processing_time_ms
                    FROM memory_metrics WHERE conversation_id = ?
                """, (conversation_id,))
                
                row = cursor.fetchone()
                if row:
                    total_messages = row[0] + 1
                    avg_processing_time = (row[1] + processing_time) / 2
                else:
                    total_messages = 1
                    avg_processing_time = processing_time
                
                # Update metrics
                cursor.execute("""
                    UPDATE memory_metrics SET 
                        total_messages = ?,
                        processing_time_ms = ?,
                        last_updated = ?
                    WHERE conversation_id = ?
                """, (
                    total_messages,
                    avg_processing_time,
                    datetime.now(timezone.utc).isoformat(),
                    conversation_id
                ))
                
                if cursor.rowcount == 0:
                    # Insert new metrics if not exists
                    cursor.execute("""
                        INSERT INTO memory_metrics (
                            conversation_id, total_messages, processing_time_ms, last_updated
                        ) VALUES (?, ?, ?, ?)
                    """, (
                        conversation_id,
                        total_messages,
                        avg_processing_time,
                        datetime.now(timezone.utc).isoformat()
                    ))
                
                conn.commit()
        
        await asyncio.get_event_loop().run_in_executor(self._executor, _db_operation)

# Global instance
_conversation_memory_manager = None

def get_conversation_memory_manager(
    storage_path: Optional[str] = None,
    config: Optional[ConversationMemoryConfig] = None
) -> ConversationMemoryManager:
    """Get or create the global conversation memory manager."""
    global _conversation_memory_manager
    if _conversation_memory_manager is None:
        _conversation_memory_manager = ConversationMemoryManager(storage_path, config)
    return _conversation_memory_manager
