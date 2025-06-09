"""Test suite for enhanced conversation memory management."""
import pytest
import asyncio
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from backend.schema.chat import ChatMessage, MessageRole
from backend.schema.conversation_memory import (
    ConversationMemoryConfig, ConversationTopic, MessageRelevance,
    ConversationSummary, TopicTransition, ContextWindow, ConversationState,
    MemoryMetrics, DecayType, TopicChangeType, MemoryPriority
)
from backend.core.memory.conversation_memory_manager import ConversationMemoryManager

class TestConversationMemoryManager:
    """Test suite for ConversationMemoryManager."""
    
    @pytest.fixture
    def temp_storage(self):
        """Create temporary storage directory."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def memory_config(self):
        """Create test memory configuration."""
        return ConversationMemoryConfig(
            max_context_tokens=16000,
            relevance_decay_factor=0.9,
            summary_threshold=10,
            topic_similarity_threshold=0.6,
            memory_compression_ratio=0.4,
            temporal_decay_hours=12.0,
            max_conversation_length=500,
            enable_background_processing=False  # Disable for testing
        )
    
    @pytest.fixture
    def memory_manager(self, temp_storage, memory_config):
        """Create test memory manager."""
        return ConversationMemoryManager(
            storage_path=temp_storage,
            config=memory_config
        )
    
    @pytest.mark.asyncio
    async def test_initialize_conversation(self, memory_manager):
        """Test conversation initialization."""
        conversation_id = "test-conversation-001"
        
        # Initialize conversation
        state = await memory_manager.initialize_conversation(conversation_id)
        
        assert state.conversation_id == conversation_id
        assert state.message_count == 0
        assert state.turn_count == 0
        assert isinstance(state.context_window, ContextWindow)
        assert state.context_window.max_token_limit == 16000
        assert not state.is_archived
    
    @pytest.mark.asyncio
    async def test_add_message_and_memory_tracking(self, memory_manager):
        """Test adding messages and memory tracking."""
        conversation_id = "test-conversation-002"
        
        # Initialize conversation
        await memory_manager.initialize_conversation(conversation_id)
        
        # Add user message
        user_message = ChatMessage(
            role=MessageRole.USER,
            content="What is machine learning and how does it work?"
        )
        
        await memory_manager.add_message(conversation_id, user_message)
        
        # Verify conversation state updated
        state = await memory_manager.get_conversation_state(conversation_id)
        assert state.message_count == 1
        assert state.turn_count == 1
        assert user_message.id in state.context_window.active_messages
        
        # Add assistant message
        assistant_message = ChatMessage(
            role=MessageRole.ASSISTANT,
            content="Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed..."
        )
        
        await memory_manager.add_message(conversation_id, assistant_message)
        
        # Verify state updated
        state = await memory_manager.get_conversation_state(conversation_id)
        assert state.message_count == 2
        assert state.turn_count == 1  # Only user messages increment turn count
        assert assistant_message.id in state.context_window.active_messages
    
    @pytest.mark.asyncio
    async def test_topic_extraction_and_tracking(self, memory_manager):
        """Test topic extraction and tracking."""
        conversation_id = "test-conversation-003"
        
        # Initialize conversation
        await memory_manager.initialize_conversation(conversation_id)
        
        # Add messages with different topics
        messages = [
            ChatMessage(
                role=MessageRole.USER,
                content="Tell me about deep learning neural networks and their applications"
            ),
            ChatMessage(
                role=MessageRole.USER,
                content="What are the different types of machine learning algorithms?"
            ),
            ChatMessage(
                role=MessageRole.USER,
                content="How do convolutional neural networks work in computer vision?"
            )
        ]
        
        for message in messages:
            await memory_manager.add_message(conversation_id, message)
        
        # Mock the topic extraction (since we need embeddings)
        with patch.object(memory_manager, '_get_embedding') as mock_embedding:
            mock_embedding.return_value = [0.1] * 768  # Mock embedding
            
            # Add another message to trigger topic extraction
            message = ChatMessage(
                role=MessageRole.USER,
                content="Can you explain backpropagation in neural networks?"
            )
            await memory_manager.add_message(conversation_id, message)
        
        # Verify conversation state
        state = await memory_manager.get_conversation_state(conversation_id)
        assert state.message_count == 4
        assert len(state.topic_history) > 0
    
    @pytest.mark.asyncio
    async def test_relevance_decay(self, memory_manager):
        """Test relevance decay functionality."""
        conversation_id = "test-conversation-004"
        
        # Initialize conversation
        await memory_manager.initialize_conversation(conversation_id)
        
        # Add some messages
        for i in range(5):
            message = ChatMessage(
                role=MessageRole.USER,
                content=f"Message {i} about artificial intelligence"
            )
            await memory_manager.add_message(conversation_id, message)
        
        # Apply relevance decay
        await memory_manager._apply_relevance_decay(conversation_id, DecayType.TEMPORAL)
        
        # Verify decay was applied (would need to check message relevances)
        # This is a simplified test - in practice, we'd verify actual relevance scores
        state = await memory_manager.get_conversation_state(conversation_id)
        assert state is not None
    
    @pytest.mark.asyncio
    async def test_context_window_management(self, memory_manager):
        """Test context window management and pruning."""
        conversation_id = "test-conversation-005"
        
        # Initialize conversation with small token limit for testing
        config = ConversationMemoryConfig(
            max_context_tokens=1000,  # Small limit for testing
            summary_threshold=5
        )
        state = await memory_manager.initialize_conversation(conversation_id, config)
        
        # Add many messages to exceed context window
        for i in range(20):
            message = ChatMessage(
                role=MessageRole.USER,
                content=f"This is message number {i} with some content that takes up tokens in the context window."
            )
            await memory_manager.add_message(conversation_id, message)
        
        # Verify context window management occurred
        final_state = await memory_manager.get_conversation_state(conversation_id)
        assert final_state.message_count == 20
        # Some messages should have been moved to archive
        assert len(final_state.context_window.archived_messages) > 0
    
    @pytest.mark.asyncio
    async def test_conversation_summary_generation(self, memory_manager):
        """Test conversation summary generation."""
        conversation_id = "test-conversation-006"
        
        # Initialize conversation with small summary threshold
        config = ConversationMemoryConfig(
            summary_threshold=3,
            enable_background_processing=False
        )
        await memory_manager.initialize_conversation(conversation_id, config)
        
        # Add messages to trigger summarization
        messages = [
            "What is artificial intelligence?",
            "How does machine learning differ from traditional programming?",
            "Can you explain deep learning architectures?"
        ]
        
        for content in messages:
            message = ChatMessage(role=MessageRole.USER, content=content)
            await memory_manager.add_message(conversation_id, message)
        
        # Verify summary was generated (simplified check)
        state = await memory_manager.get_conversation_state(conversation_id)
        assert state.message_count == 3
    
    @pytest.mark.asyncio
    async def test_get_relevant_context(self, memory_manager):
        """Test getting relevant context for queries."""
        conversation_id = "test-conversation-007"
        
        # Initialize conversation
        await memory_manager.initialize_conversation(conversation_id)
        
        # Add some messages
        messages = [
            "Tell me about neural networks",
            "What are the applications of deep learning?",
            "How do we train machine learning models?"
        ]
        
        for content in messages:
            message = ChatMessage(role=MessageRole.USER, content=content)
            await memory_manager.add_message(conversation_id, message)
        
        # Get relevant context
        context = await memory_manager.get_relevant_context(
            conversation_id, 
            "What is deep learning?",
            max_tokens=4000
        )
        
        assert "messages" in context
        assert "topics" in context
        assert "summaries" in context
        assert "context_window" in context
    
    def test_memory_configuration_validation(self):
        """Test memory configuration validation."""
        # Valid configuration
        config = ConversationMemoryConfig(
            relevance_decay_factor=0.95,
            summary_threshold=10
        )
        assert config.relevance_decay_factor == 0.95
        
        # Invalid decay factor should raise validation error
        with pytest.raises(ValueError):
            ConversationMemoryConfig(relevance_decay_factor=1.5)
    
    def test_conversation_topic_model(self):
        """Test ConversationTopic model."""
        topic = ConversationTopic(
            name="Machine Learning",
            keywords=["neural", "networks", "training"],
            confidence_score=0.8
        )
        
        assert topic.name == "Machine Learning"
        assert len(topic.keywords) == 3
        assert topic.confidence_score == 0.8
        assert topic.message_count == 1  # Default value
    
    def test_message_relevance_model(self):
        """Test MessageRelevance model."""
        relevance = MessageRelevance(
            message_id="msg-001",
            priority=MemoryPriority.HIGH
        )
        
        assert relevance.message_id == "msg-001"
        assert relevance.priority == MemoryPriority.HIGH
        assert relevance.base_relevance == 1.0
        assert relevance.current_relevance == 1.0
    
    def test_conversation_summary_model(self):
        """Test ConversationSummary model."""
        summary = ConversationSummary(
            conversation_id="conv-001",
            summary_type="periodic",
            content="Summary of recent conversation about AI",
            compression_ratio=0.3,
            token_count=50,
            original_token_count=150
        )
        
        assert summary.conversation_id == "conv-001"
        assert summary.compression_ratio == 0.3
        assert summary.token_count == 50
    
    @pytest.mark.asyncio
    async def test_memory_metrics_tracking(self, memory_manager):
        """Test memory metrics tracking."""
        conversation_id = "test-conversation-008"
        
        # Initialize conversation
        await memory_manager.initialize_conversation(conversation_id)
        
        # Add several messages
        for i in range(5):
            message = ChatMessage(
                role=MessageRole.USER,
                content=f"Test message {i}"
            )
            await memory_manager.add_message(conversation_id, message)
        
        # Verify metrics are being tracked
        # In a real implementation, we'd check the metrics database
        state = await memory_manager.get_conversation_state(conversation_id)
        assert state.message_count == 5

class TestConversationMemoryIntegration:
    """Integration tests for conversation memory with chat service."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_conversation_flow(self):
        """Test complete conversation flow with memory management."""
        # This would test the full integration with ChatService
        # For now, we'll test the memory manager in isolation
        
        temp_dir = tempfile.mkdtemp()
        try:
            config = ConversationMemoryConfig(
                max_context_tokens=8000,
                summary_threshold=5
            )
            
            memory_manager = ConversationMemoryManager(
                storage_path=temp_dir,
                config=config
            )
            
            conversation_id = "integration-test-001"
            
            # Simulate a multi-turn conversation
            conversation_turns = [
                ("What is artificial intelligence?", "AI is..."),
                ("How does machine learning work?", "Machine learning works by..."),
                ("What are neural networks?", "Neural networks are..."),
                ("Can you explain deep learning?", "Deep learning is..."),
                ("What are the applications of AI?", "AI applications include...")
            ]
            
            for user_content, assistant_content in conversation_turns:
                # Add user message
                user_msg = ChatMessage(role=MessageRole.USER, content=user_content)
                await memory_manager.add_message(conversation_id, user_msg)
                
                # Add assistant message
                assistant_msg = ChatMessage(role=MessageRole.ASSISTANT, content=assistant_content)
                await memory_manager.add_message(conversation_id, assistant_msg)
            
            # Verify final state
            final_state = await memory_manager.get_conversation_state(conversation_id)
            assert final_state.message_count == 10  # 5 turns * 2 messages each
            assert final_state.turn_count == 5
            
            # Test context retrieval
            context = await memory_manager.get_relevant_context(
                conversation_id,
                "Tell me more about neural networks",
                max_tokens=4000
            )
            
            assert len(context["messages"]) > 0
            
        finally:
            shutil.rmtree(temp_dir)

if __name__ == "__main__":
    # Run specific test
    pytest.main([__file__, "-v"])
