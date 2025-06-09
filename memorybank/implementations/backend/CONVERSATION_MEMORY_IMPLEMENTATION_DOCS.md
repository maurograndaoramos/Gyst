# Enhanced Conversation Context Management for CrewAI

## Overview

The Enhanced Conversation Context Management system provides advanced memory capabilities for CrewAI conversations, enabling intelligent context retention, relevance-based information retrieval, and efficient memory usage across long-running conversations.

## Features

### ✅ Core Features Implemented

- **Multi-turn Conversation Memory**: Persistent memory across conversation sessions
- **Context Window Management**: Intelligent token budget allocation and pruning
- **Relevance Decay**: Time-based and interaction-based decay for old messages
- **Topic Tracking**: Real-time topic extraction and transition detection
- **Conversation Summarization**: Progressive summarization for long conversations
- **Memory Efficient Storage**: Compressed storage with semantic indexing

## Architecture

### Core Components

```
ConversationMemoryManager
├── ShortTermMemory (Current session)
├── LongTermMemory (Persistent across sessions)
├── ContextWindowManager (Token budget allocation)
├── RelevanceDecayEngine (Old message decay)
├── TopicTracker (Conversation topics)
└── SummaryGenerator (Context compression)
```

### Data Models

The system uses several Pydantic models for type safety and validation:

- `ConversationMemoryConfig`: Memory system configuration
- `ConversationState`: Current conversation state and metadata
- `MessageRelevance`: Message relevance scores and decay factors
- `ConversationTopic`: Topic identification and tracking
- `ConversationSummary`: Generated conversation summaries
- `TopicTransition`: Topic change detection and bridging
- `ContextWindow`: Active context window management
- `MemoryMetrics`: Performance monitoring and metrics

## Usage

### Basic Setup

```python
from backend.src.backend.core.memory import get_conversation_memory_manager
from backend.src.backend.schema.conversation_memory import ConversationMemoryConfig

# Configure memory settings
config = ConversationMemoryConfig(
    max_context_tokens=32000,
    relevance_decay_factor=0.95,
    summary_threshold=20,
    topic_similarity_threshold=0.7,
    memory_compression_ratio=0.3
)

# Initialize memory manager
memory_manager = get_conversation_memory_manager(config=config)
```

### Adding Messages

```python
from backend.src.backend.schema.chat import ChatMessage, MessageRole

# Create a message
message = ChatMessage(
    role=MessageRole.USER,
    content="What is machine learning?"
)

# Add to conversation memory
await memory_manager.add_message("conversation-001", message)
```

### Retrieving Context

```python
# Get relevant context for a query
context = await memory_manager.get_relevant_context(
    "conversation-001",
    "Tell me more about neural networks",
    max_tokens=8000
)

# Access context components
relevant_messages = context["messages"]
current_topics = context["topics"]
summaries = context["summaries"]
context_window = context["context_window"]
```

### Configuration Options

#### Memory Configuration

```python
ConversationMemoryConfig(
    max_context_tokens=32000,        # Maximum tokens in context window
    relevance_decay_factor=0.95,     # Exponential decay factor (0.1-1.0)
    summary_threshold=20,            # Messages before summarization (5-100)
    topic_similarity_threshold=0.7,  # Topic similarity threshold (0.1-1.0)
    memory_compression_ratio=0.3,    # Target compression ratio (0.1-0.8)
    temporal_decay_hours=24.0,       # Half-life for temporal decay
    max_conversation_length=1000,    # Max messages before archival
    enable_background_processing=True # Enable background operations
)
```

## Advanced Features

### Relevance Decay

The system implements multiple types of relevance decay:

```python
from backend.src.backend.schema.conversation_memory import DecayType

# Apply different decay types
await memory_manager._apply_relevance_decay(
    conversation_id, 
    DecayType.TEMPORAL    # Time-based decay
)

await memory_manager._apply_relevance_decay(
    conversation_id, 
    DecayType.POSITIONAL  # Position-based decay
)

await memory_manager._apply_relevance_decay(
    conversation_id, 
    DecayType.COMBINED    # Combined temporal + positional
)
```

### Topic Tracking

Topics are automatically extracted and tracked:

```python
# Get topics for a conversation
topics = await memory_manager._get_topics_for_conversation(conversation_id)

for topic in topics:
    print(f"Topic: {topic.name}")
    print(f"Keywords: {topic.keywords}")
    print(f"Relevance: {topic.relevance_score}")
    print(f"Messages: {topic.message_count}")
```

### Context Window Management

The system automatically manages context windows:

```python
# Get conversation state
state = await memory_manager.get_conversation_state(conversation_id)
window = state.context_window

print(f"Active messages: {len(window.active_messages)}")
print(f"Archived messages: {len(window.archived_messages)}")
print(f"Current tokens: {window.current_token_count}")
print(f"Token limit: {window.max_token_limit}")
```

## Integration with ChatService

The enhanced memory system is integrated with the existing ChatService:

```python
from backend.src.backend.core.services.chat_service import get_chat_service

# The chat service automatically uses enhanced memory
chat_service = get_chat_service()

# Process a chat request with enhanced memory
response = await chat_service.chat(ChatRequest(
    message="What did we discuss about neural networks?",
    conversation_id="my-conversation",
    document_paths=["path/to/document.pdf"]
))
```

## Performance Considerations

### Memory Efficiency

- Messages are automatically archived when context window approaches limits
- Summaries are generated to compress conversation history
- Relevance decay removes low-value information
- Background processing avoids blocking operations

### Token Management

- Dynamic context window sizing based on conversation complexity
- Intelligent pruning preserves important context
- Progressive summarization when approaching limits
- Emergency compression with minimal information loss

### Database Performance

- SQLite with optimized indexes for fast queries
- JSON serialization for complex data structures
- Thread pool executor for non-blocking database operations
- Efficient caching of frequently accessed data

## Monitoring and Metrics

### Memory Metrics

```python
# Get conversation metrics
state = await memory_manager.get_conversation_state(conversation_id)

metrics = {
    "total_messages": state.message_count,
    "turn_count": state.turn_count,
    "topics_tracked": len(state.topic_history),
    "active_messages": len(state.context_window.active_messages),
    "archived_messages": len(state.context_window.archived_messages),
    "compression_count": state.context_window.compression_count
}
```

### Health Status

```python
# Check system health
health = chat_service.get_health_status()

print(f"Enhanced memory status: {health['enhanced_memory_status']}")
print(f"Active conversations: {health['active_conversations']}")
```

## Testing

### Running Tests

```bash
# Run conversation memory tests
pytest backend/tests/test_conversation_memory.py -v

# Run specific test
pytest backend/tests/test_conversation_memory.py::TestConversationMemoryManager::test_initialize_conversation -v
```

### Demo Script

```bash
# Run the comprehensive demo
python backend/examples/conversation_memory_demo.py
```

## Best Practices

### Configuration

1. **Set appropriate token limits** based on your model's context window
2. **Adjust decay factors** based on conversation length and importance
3. **Configure summary thresholds** to balance compression vs. detail
4. **Enable background processing** for production environments

### Usage Patterns

1. **Initialize conversations early** to ensure proper memory tracking
2. **Use consistent conversation IDs** for session continuity
3. **Monitor memory metrics** to optimize performance
4. **Handle memory errors gracefully** with fallback mechanisms

### Production Deployment

1. **Set up proper database backups** for conversation persistence
2. **Monitor disk usage** for conversation storage
3. **Configure log levels** appropriately for debugging
4. **Implement cleanup procedures** for old conversations

## Troubleshooting

### Common Issues

#### High Memory Usage

```python
# Check conversation metrics
state = await memory_manager.get_conversation_state(conversation_id)
if state.context_window.current_token_count > threshold:
    # Force context pruning
    await memory_manager._manage_context_window(conversation_id)
```

#### Slow Context Retrieval

```python
# Reduce context retrieval scope
context = await memory_manager.get_relevant_context(
    conversation_id,
    query,
    max_tokens=4000  # Smaller token limit
)
```

#### Database Lock Issues

- Ensure proper connection handling in multi-threaded environments
- Use connection pooling for high-concurrency scenarios
- Consider Redis caching for frequently accessed data

### Debugging

Enable detailed logging:

```python
import logging
logging.getLogger("backend.src.backend.core.memory").setLevel(logging.DEBUG)
```

## Future Enhancements

### Planned Features

- **Semantic Search**: Vector-based similarity search for context retrieval
- **Cross-Conversation Learning**: Knowledge transfer between conversations
- **Advanced Summarization**: AI-powered intelligent summarization
- **Memory Optimization**: Automated memory tuning based on usage patterns
- **Multi-Modal Support**: Support for image and audio context
- **Distributed Storage**: Support for distributed conversation storage

### Performance Improvements

- **Async Database Operations**: Full async database layer
- **Caching Layer**: Redis integration for improved performance
- **Batch Processing**: Batch operations for multiple messages
- **Memory Streaming**: Streaming context retrieval for large conversations

## API Reference

### ConversationMemoryManager

#### Methods

- `initialize_conversation(conversation_id, config)`: Initialize new conversation
- `add_message(conversation_id, message)`: Add message to conversation
- `get_conversation_state(conversation_id)`: Get current conversation state
- `get_relevant_context(conversation_id, query, max_tokens)`: Retrieve relevant context
- `_apply_relevance_decay(conversation_id, decay_type)`: Apply relevance decay
- `_manage_context_window(conversation_id)`: Manage context window
- `_generate_conversation_summary(conversation_id)`: Generate summary

### Configuration Models

See `backend/src/backend/schema/conversation_memory.py` for complete model definitions.

## Support

For issues, questions, or contributions:

1. Check the test suite for usage examples
2. Run the demo script to understand functionality
3. Review the source code for implementation details
4. Create issues for bugs or feature requests

---

*This enhanced conversation memory system provides a robust foundation for building intelligent, context-aware conversational AI applications with CrewAI.*
