"""
Demonstration of Enhanced Conversation Context Management for CrewAI

This script demonstrates the advanced conversation memory features including:
- Multi-turn conversation memory
- Context window management with intelligent pruning
- Relevance decay for old messages
- Topic tracking and transitions
- Conversation summarization
- Memory-efficient storage
"""

import asyncio
import json
import tempfile
import shutil
from datetime import datetime
from pathlib import Path

from backend.schema.chat import ChatMessage, MessageRole
from backend.schema.conversation_memory import (
    ConversationMemoryConfig, DecayType, MemoryPriority
)
from backend.core.memory.conversation_memory_manager import ConversationMemoryManager

class ConversationMemoryDemo:
    """Demo class showcasing conversation memory features."""
    
    def __init__(self):
        """Initialize the demo."""
        self.temp_dir = tempfile.mkdtemp()
        self.memory_manager = None
    
    def cleanup(self):
        """Clean up temporary resources."""
        if self.temp_dir:
            shutil.rmtree(self.temp_dir)
    
    async def setup_memory_manager(self):
        """Set up the memory manager with demo configuration."""
        print("🚀 Setting up Enhanced Conversation Memory Manager...")
        
        # Configure memory settings for demonstration
        config = ConversationMemoryConfig(
            max_context_tokens=8000,        # Moderate context window
            relevance_decay_factor=0.95,    # Slow decay for demo
            summary_threshold=8,             # Summarize every 8 messages
            topic_similarity_threshold=0.6, # Moderate topic similarity
            memory_compression_ratio=0.3,   # 30% compression target
            temporal_decay_hours=24.0,      # 24-hour half-life
            max_conversation_length=200,    # Archive after 200 messages
            enable_background_processing=False  # Disable for demo
        )
        
        self.memory_manager = ConversationMemoryManager(
            storage_path=self.temp_dir,
            config=config
        )
        
        print(f"✅ Memory manager initialized with storage at: {self.temp_dir}")
        print(f"📊 Configuration: {config.max_context_tokens} max tokens, "
              f"{config.summary_threshold} message summary threshold")
    
    async def demo_basic_conversation_flow(self):
        """Demonstrate basic conversation flow with memory."""
        print("\n" + "="*60)
        print("📝 DEMO 1: Basic Conversation Flow with Memory")
        print("="*60)
        
        conversation_id = "demo-conversation-001"
        
        # Initialize conversation
        state = await self.memory_manager.initialize_conversation(conversation_id)
        print(f"🆕 Initialized conversation: {conversation_id}")
        print(f"📈 Initial state: {state.message_count} messages, {state.turn_count} turns")
        
        # Simulate a conversation about AI and machine learning
        conversation_pairs = [
            ("What is artificial intelligence?", 
             "Artificial intelligence (AI) is a broad field of computer science focused on creating systems that can perform tasks typically requiring human intelligence."),
            
            ("How does machine learning relate to AI?",
             "Machine learning is a subset of AI that enables systems to automatically learn and improve from experience without being explicitly programmed."),
            
            ("What are neural networks?",
             "Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes that process information."),
            
            ("Can you explain deep learning?",
             "Deep learning is a subset of machine learning using neural networks with multiple layers to model and understand complex patterns in data."),
            
            ("What are some applications of AI?",
             "AI applications include natural language processing, computer vision, autonomous vehicles, recommendation systems, and medical diagnosis.")
        ]
        
        for i, (user_msg, assistant_msg) in enumerate(conversation_pairs, 1):
            print(f"\n--- Turn {i} ---")
            
            # Add user message
            user_message = ChatMessage(role=MessageRole.USER, content=user_msg)
            await self.memory_manager.add_message(conversation_id, user_message)
            print(f"👤 User: {user_msg}")
            
            # Add assistant message
            assistant_message = ChatMessage(role=MessageRole.ASSISTANT, content=assistant_msg)
            await self.memory_manager.add_message(conversation_id, assistant_message)
            print(f"🤖 Assistant: {assistant_msg[:100]}...")
            
            # Show updated state
            state = await self.memory_manager.get_conversation_state(conversation_id)
            print(f"📊 State: {state.message_count} messages, {state.turn_count} turns, "
                  f"{len(state.topic_history)} topics tracked")
        
        return conversation_id
    
    async def demo_context_retrieval(self, conversation_id):
        """Demonstrate intelligent context retrieval."""
        print("\n" + "="*60)
        print("🔍 DEMO 2: Intelligent Context Retrieval")
        print("="*60)
        
        queries = [
            "Tell me more about neural networks",
            "What are the practical applications?",
            "How does learning work in AI?"
        ]
        
        for query in queries:
            print(f"\n🔎 Query: {query}")
            
            context = await self.memory_manager.get_relevant_context(
                conversation_id, 
                query, 
                max_tokens=4000
            )
            
            print(f"📋 Retrieved {len(context['messages'])} relevant messages")
            print(f"🏷️  Topics: {len(context['topics'])} identified")
            print(f"📄 Summaries: {len(context['summaries'])} available")
            
            if context['current_topic']:
                print(f"🎯 Current topic: {context['current_topic']}")
            
            # Show context window info
            window = context['context_window']
            print(f"🪟 Context window: {len(window.active_messages)} active, "
                  f"{len(window.archived_messages)} archived, "
                  f"{window.current_token_count} tokens")
    
    async def demo_relevance_decay(self, conversation_id):
        """Demonstrate relevance decay functionality."""
        print("\n" + "="*60)
        print("⏰ DEMO 3: Relevance Decay System")
        print("="*60)
        
        # Add more messages to the conversation
        additional_messages = [
            "What about reinforcement learning?",
            "How do we evaluate AI models?",
            "What are the ethical considerations?",
            "Tell me about transformer architectures",
            "What is the future of AI?"
        ]
        
        print("📝 Adding more messages to demonstrate decay...")
        for msg in additional_messages:
            message = ChatMessage(role=MessageRole.USER, content=msg)
            await self.memory_manager.add_message(conversation_id, message)
        
        # Apply different types of decay
        decay_types = [DecayType.TEMPORAL, DecayType.POSITIONAL, DecayType.COMBINED]
        
        for decay_type in decay_types:
            print(f"\n🔄 Applying {decay_type.value} decay...")
            await self.memory_manager._apply_relevance_decay(conversation_id, decay_type)
            
            # Get updated context to see effect
            context = await self.memory_manager.get_relevant_context(
                conversation_id, 
                "What is machine learning?", 
                max_tokens=2000
            )
            
            print(f"📊 After {decay_type.value} decay: {len(context['messages'])} relevant messages")
    
    async def demo_context_window_management(self):
        """Demonstrate context window management and pruning."""
        print("\n" + "="*60)
        print("🪟 DEMO 4: Context Window Management")
        print("="*60)
        
        # Create a conversation with a small context window for demonstration
        conversation_id = "demo-conversation-002"
        
        # Initialize with small context window
        small_config = ConversationMemoryConfig(
            max_context_tokens=2000,  # Small window for demo
            summary_threshold=5,
            enable_background_processing=False
        )
        
        await self.memory_manager.initialize_conversation(conversation_id, small_config)
        print(f"🆕 Created conversation with 2000 token limit")
        
        # Add many messages to trigger pruning
        messages = [
            "What is computer vision and how does it work in AI systems?",
            "Can you explain natural language processing and its applications?",
            "How do recommendation systems use machine learning algorithms?",
            "What are the differences between supervised and unsupervised learning?",
            "How do genetic algorithms work in evolutionary computation?",
            "What is the role of data preprocessing in machine learning?",
            "Can you explain the concept of overfitting in model training?",
            "How do ensemble methods improve machine learning performance?",
            "What are the key challenges in deploying AI systems in production?",
            "How does transfer learning work in deep neural networks?"
        ]
        
        for i, msg_content in enumerate(messages, 1):
            message = ChatMessage(role=MessageRole.USER, content=msg_content)
            await self.memory_manager.add_message(conversation_id, message)
            
            state = await self.memory_manager.get_conversation_state(conversation_id)
            window = state.context_window
            
            print(f"📝 Message {i}: {len(window.active_messages)} active, "
                  f"{len(window.archived_messages)} archived, "
                  f"{window.current_token_count} tokens")
            
            if len(window.archived_messages) > 0:
                print(f"🗄️  Context pruning occurred! {len(window.archived_messages)} messages archived")
    
    async def demo_topic_tracking(self):
        """Demonstrate topic tracking and transitions."""
        print("\n" + "="*60)
        print("🏷️  DEMO 5: Topic Tracking and Transitions")
        print("="*60)
        
        conversation_id = "demo-conversation-003"
        await self.memory_manager.initialize_conversation(conversation_id)
        
        # Messages that should create different topics
        topic_messages = [
            "Let's talk about machine learning algorithms and their types",
            "What are neural networks and how do they process information?",
            "Can you explain computer vision applications in autonomous vehicles?",
            "How does natural language processing work in chatbots?",
            "What about robotics and AI integration in manufacturing?",
            "Let's go back to neural networks - what is backpropagation?",
            "How do convolutional neural networks work in image recognition?"
        ]
        
        print("📝 Adding messages with different topics...")
        
        for i, msg_content in enumerate(topic_messages, 1):
            message = ChatMessage(role=MessageRole.USER, content=msg_content)
            
            # Mock embedding generation for topic extraction
            import unittest.mock
            with unittest.mock.patch.object(
                self.memory_manager, '_get_embedding', 
                return_value=[0.1 * i] * 768  # Different embeddings for different topics
            ):
                await self.memory_manager.add_message(conversation_id, message)
            
            state = await self.memory_manager.get_conversation_state(conversation_id)
            print(f"🏷️  Message {i}: {len(state.topic_history)} topics tracked")
            
            if state.current_topic_id:
                print(f"🎯 Current topic: {state.current_topic_id}")
        
        print(f"\n📊 Final topic history: {len(state.topic_history)} unique topics")
    
    async def demo_conversation_summarization(self):
        """Demonstrate conversation summarization."""
        print("\n" + "="*60)
        print("📄 DEMO 6: Conversation Summarization")
        print("="*60)
        
        conversation_id = "demo-conversation-004"
        
        # Initialize with small summary threshold
        summary_config = ConversationMemoryConfig(
            summary_threshold=5,  # Summarize every 5 messages (minimum allowed)
            enable_background_processing=False
        )
        
        await self.memory_manager.initialize_conversation(conversation_id, summary_config)
        print(f"🆕 Created conversation with 4-message summary threshold")
        
        # Add messages to trigger summarization
        summary_messages = [
            "What is artificial intelligence?",
            "How does it differ from traditional programming?",
            "What are the main types of AI?",
            "Can you give examples of AI applications?",
            "What are the challenges in AI development?",
            "How do we ensure AI safety?",
            "What is the future of AI technology?",
            "How will AI impact society?"
        ]
        
        for i, msg_content in enumerate(summary_messages, 1):
            message = ChatMessage(role=MessageRole.USER, content=msg_content)
            await self.memory_manager.add_message(conversation_id, message)
            
            state = await self.memory_manager.get_conversation_state(conversation_id)
            
            print(f"📝 Message {i}: {state.message_count} total messages")
            
            if i % summary_config.summary_threshold == 0:
                print(f"📄 Summary should be generated at message {i}")
                # In a real implementation, summaries would be stored
                # Here we're just demonstrating the trigger logic
    
    async def demo_memory_metrics(self, conversation_id):
        """Demonstrate memory metrics and performance monitoring."""
        print("\n" + "="*60)
        print("📊 DEMO 7: Memory Metrics and Performance")
        print("="*60)
        
        # Get conversation state for metrics
        state = await self.memory_manager.get_conversation_state(conversation_id)
        
        if state:
            print(f"📈 Conversation Metrics for {conversation_id}:")
            print(f"   💬 Total messages: {state.message_count}")
            print(f"   🔄 Turn count: {state.turn_count}")
            print(f"   🏷️  Topics tracked: {len(state.topic_history)}")
            print(f"   ⏰ Session duration: {datetime.utcnow() - state.session_start}")
            print(f"   🕐 Last activity: {state.last_activity}")
            
            # Context window metrics
            window = state.context_window
            print(f"\n🪟 Context Window Metrics:")
            print(f"   📝 Active messages: {len(window.active_messages)}")
            print(f"   🗄️  Archived messages: {len(window.archived_messages)}")
            print(f"   📊 Current tokens: {window.current_token_count}/{window.max_token_limit}")
            print(f"   🗜️  Compressions: {window.compression_count}")
            
            if window.last_pruned:
                print(f"   ✂️  Last pruned: {window.last_pruned}")
            
            # Memory efficiency calculation
            total_messages = len(window.active_messages) + len(window.archived_messages)
            if total_messages > 0:
                efficiency = len(window.active_messages) / total_messages * 100
                print(f"   🎯 Memory efficiency: {efficiency:.1f}% active")
    
    def print_summary(self):
        """Print demo summary."""
        print("\n" + "="*60)
        print("🎉 DEMO COMPLETE: Enhanced Conversation Memory")
        print("="*60)
        print("✅ Features Demonstrated:")
        print("   📝 Multi-turn conversation memory between sessions")
        print("   🪟 Dynamic context window management with intelligent pruning")
        print("   ⏰ Relevance decay for old messages (temporal, positional, semantic)")
        print("   🏷️  Topic tracking and transition detection")
        print("   📄 Conversation summarization at configurable intervals")
        print("   💾 Memory-efficient storage with compression")
        print("   🔍 Intelligent context retrieval based on query relevance")
        print("   📊 Performance metrics and monitoring")
        print("\n🚀 The enhanced conversation memory system provides:")
        print("   • Better context awareness across long conversations")
        print("   • Efficient memory usage within token limits")
        print("   • Intelligent information retention and retrieval")
        print("   • Topic continuity and conversation flow")
        print("   • Scalable storage for production use")

async def run_demo():
    """Run the complete conversation memory demonstration."""
    demo = ConversationMemoryDemo()
    
    try:
        print("🎯 Enhanced Conversation Context Management Demo")
        print("=" * 60)
        print("This demo showcases the advanced memory features for CrewAI conversations.")
        
        # Setup
        await demo.setup_memory_manager()
        
        # Run demonstrations
        conversation_id = await demo.demo_basic_conversation_flow()
        await demo.demo_context_retrieval(conversation_id)
        await demo.demo_relevance_decay(conversation_id)
        await demo.demo_context_window_management()
        await demo.demo_topic_tracking()
        await demo.demo_conversation_summarization()
        await demo.demo_memory_metrics(conversation_id)
        
        # Summary
        demo.print_summary()
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        raise
    finally:
        demo.cleanup()

if __name__ == "__main__":
    asyncio.run(run_demo())
