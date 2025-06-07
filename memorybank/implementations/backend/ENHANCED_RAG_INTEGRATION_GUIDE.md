# Enhanced RAG System Integration Guide

## Quick Start Integration

This guide shows how to integrate the Enhanced RAG system into the existing Gyst application with minimal changes.

## Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt

# Download required NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Download spaCy model (optional, for advanced text processing)
python -m spacy download en_core_web_sm
```

## Step 2: Update Environment Configuration

Add these settings to your `.env` file:

```env
# Enhanced RAG Configuration
ENABLE_ENHANCED_RAG=true
EMBEDDING_CACHE_DB_PATH=./data/embedding_cache.db
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
MAX_CHUNK_SIZE=512
CHUNK_OVERLAP_RATIO=0.2
CACHE_TTL_SECONDS=86400
ENABLE_SEMANTIC_SCORING=true
MAX_DOCUMENTS_PER_QUERY=5

# Performance Settings
MAX_BATCH_SIZE=50
MAX_CONCURRENT_BATCHES=3
CACHE_WARMING_ENABLED=true
ADAPTIVE_BATCHING=true

# Memory Management
MAX_MEMORY_USAGE_MB=500
MEMORY_PRESSURE_THRESHOLD=0.8
CHUNK_CACHE_SIZE=100

# Scoring Weights (sum should equal 1.0)
TAG_SIMILARITY_WEIGHT=0.4
SEMANTIC_SIMILARITY_WEIGHT=0.3
CONTENT_RELEVANCE_WEIGHT=0.2
STRUCTURAL_QUALITY_WEIGHT=0.05
FRESHNESS_WEIGHT=0.05
```

## Step 3: Update Existing Chat Route

Modify `backend/src/backend/api/routes/chat.py` to use the enhanced RAG system:

```python
# Add imports at the top
from ...core.processing.chunking import get_smart_chunker, get_chunk_optimizer
from ...core.cache import get_embedding_cache_manager, get_embedding_batch_processor
from ...core.selection import get_tag_based_selector
from ...core.processing.chunking.smart_chunker import ChunkingStrategy
from ...core.cache.embedding_batch_processor import BatchItem

# Add enhanced processing function
async def process_documents_with_enhanced_rag(
    documents: List[str],
    query: str,
    existing_tags: List[TagModel] = None
) -> Dict[str, Any]:
    """Process documents using the enhanced RAG system."""
    
    # Initialize components
    chunker = get_smart_chunker()
    optimizer = get_chunk_optimizer()
    batch_processor = get_embedding_batch_processor()
    selector = get_tag_based_selector(enable_semantic_scoring=True)
    
    processed_docs = {}
    all_chunks = {}
    
    # Process each document
    for doc_path in documents:
        try:
            # Extract content
            from ...core.processing.chunking.content_extractor import get_content_extractor
            extractor = get_content_extractor()
            extracted_content = extractor.extract_content(doc_path)
            
            if extracted_content.extraction_quality < 0.3:
                logger.warning(f"Low extraction quality for {doc_path}: {extracted_content.extraction_quality}")
                continue
            
            # Smart chunking
            chunks = chunker.chunk_document(
                content=extracted_content.cleaned_content,
                document_path=doc_path,
                strategy=ChunkingStrategy.ADAPTIVE
            )
            
            # Optimize chunks
            optimized_chunks, metrics = await optimizer.optimize_chunks(chunks, doc_path)
            
            processed_docs[doc_path] = {
                "chunks": optimized_chunks,
                "metadata": extracted_content.metadata,
                "metrics": metrics
            }
            all_chunks[doc_path] = optimized_chunks
            
        except Exception as e:
            logger.error(f"Failed to process document {doc_path}: {e}")
            continue
    
    # Generate embeddings for all chunks
    batch_items = []
    for doc_path, doc_data in processed_docs.items():
        for chunk in doc_data["chunks"]:
            batch_items.append(BatchItem(
                content=chunk.content,
                model_name="default",
                content_type=chunk.chunk_type,
                chunk_index=chunk.chunk_index,
                document_path=doc_path,
                token_count=chunk.token_count
            ))
    
    if batch_items:
        embedding_result = await batch_processor.process_batch_items(batch_items)
        logger.info(f"Generated embeddings for {embedding_result.successful_items} chunks")
    
    return {
        "processed_documents": processed_docs,
        "total_chunks": len(batch_items),
        "chunk_distribution": all_chunks
    }

# Update the chat endpoint
@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Existing validation and setup code...
        
        # Enhanced document selection
        if request.selected_documents:
            # Process documents with enhanced RAG
            rag_result = await process_documents_with_enhanced_rag(
                documents=request.selected_documents,
                query=request.message,
                existing_tags=[]  # Add tags if available
            )
            
            # Use enhanced context in your existing chat logic
            enhanced_context = {
                "documents": rag_result["processed_documents"],
                "total_chunks": rag_result["total_chunks"],
                "query": request.message
            }
            
            # Continue with existing chat processing using enhanced_context
            response = await generate_chat_response(request.message, enhanced_context)
            
        else:
            # Fallback to existing logic for queries without documents
            response = await generate_chat_response(request.message, {})
        
        return ChatResponse(
            message=response,
            conversation_id=request.conversation_id
        )
        
    except Exception as e:
        logger.error(f"Enhanced chat processing failed: {e}")
        # Fallback to original implementation
        return await original_chat_endpoint(request)
```

## Step 4: Add Configuration Management

Create `backend/src/backend/core/config/rag_config.py`:

```python
"""Configuration management for Enhanced RAG system."""
import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class EnhancedRAGConfig:
    """Configuration for Enhanced RAG system."""
    
    # Feature flags
    enable_enhanced_rag: bool = True
    enable_semantic_scoring: bool = True
    cache_warming_enabled: bool = True
    adaptive_batching: bool = True
    
    # Model settings
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    max_chunk_size: int = 512
    chunk_overlap_ratio: float = 0.2
    
    # Cache settings
    embedding_cache_db_path: str = "./data/embedding_cache.db"
    cache_ttl_seconds: int = 86400
    max_memory_usage_mb: int = 500
    chunk_cache_size: int = 100
    
    # Performance settings
    max_batch_size: int = 50
    max_concurrent_batches: int = 3
    memory_pressure_threshold: float = 0.8
    max_documents_per_query: int = 5
    
    # Scoring weights
    tag_similarity_weight: float = 0.4
    semantic_similarity_weight: float = 0.3
    content_relevance_weight: float = 0.2
    structural_quality_weight: float = 0.05
    freshness_weight: float = 0.05
    
    @classmethod
    def from_env(cls) -> "EnhancedRAGConfig":
        """Create configuration from environment variables."""
        return cls(
            enable_enhanced_rag=os.getenv("ENABLE_ENHANCED_RAG", "true").lower() == "true",
            enable_semantic_scoring=os.getenv("ENABLE_SEMANTIC_SCORING", "true").lower() == "true",
            cache_warming_enabled=os.getenv("CACHE_WARMING_ENABLED", "true").lower() == "true",
            adaptive_batching=os.getenv("ADAPTIVE_BATCHING", "true").lower() == "true",
            
            embedding_model_name=os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2"),
            max_chunk_size=int(os.getenv("MAX_CHUNK_SIZE", "512")),
            chunk_overlap_ratio=float(os.getenv("CHUNK_OVERLAP_RATIO", "0.2")),
            
            embedding_cache_db_path=os.getenv("EMBEDDING_CACHE_DB_PATH", "./data/embedding_cache.db"),
            cache_ttl_seconds=int(os.getenv("CACHE_TTL_SECONDS", "86400")),
            max_memory_usage_mb=int(os.getenv("MAX_MEMORY_USAGE_MB", "500")),
            chunk_cache_size=int(os.getenv("CHUNK_CACHE_SIZE", "100")),
            
            max_batch_size=int(os.getenv("MAX_BATCH_SIZE", "50")),
            max_concurrent_batches=int(os.getenv("MAX_CONCURRENT_BATCHES", "3")),
            memory_pressure_threshold=float(os.getenv("MEMORY_PRESSURE_THRESHOLD", "0.8")),
            max_documents_per_query=int(os.getenv("MAX_DOCUMENTS_PER_QUERY", "5")),
            
            tag_similarity_weight=float(os.getenv("TAG_SIMILARITY_WEIGHT", "0.4")),
            semantic_similarity_weight=float(os.getenv("SEMANTIC_SIMILARITY_WEIGHT", "0.3")),
            content_relevance_weight=float(os.getenv("CONTENT_RELEVANCE_WEIGHT", "0.2")),
            structural_quality_weight=float(os.getenv("STRUCTURAL_QUALITY_WEIGHT", "0.05")),
            freshness_weight=float(os.getenv("FRESHNESS_WEIGHT", "0.05"))
        )
    
    def validate(self) -> bool:
        """Validate configuration values."""
        # Check weight sum
        total_weight = (
            self.tag_similarity_weight + 
            self.semantic_similarity_weight + 
            self.content_relevance_weight + 
            self.structural_quality_weight + 
            self.freshness_weight
        )
        
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f"Scoring weights must sum to 1.0, got {total_weight}")
        
        # Check positive values
        if self.max_chunk_size <= 0:
            raise ValueError("max_chunk_size must be positive")
        
        if not (0 <= self.chunk_overlap_ratio <= 1):
            raise ValueError("chunk_overlap_ratio must be between 0 and 1")
        
        return True

# Global configuration instance
_rag_config: Optional[EnhancedRAGConfig] = None

def get_rag_config() -> EnhancedRAGConfig:
    """Get or create the global RAG configuration."""
    global _rag_config
    if _rag_config is None:
        _rag_config = EnhancedRAGConfig.from_env()
        _rag_config.validate()
    return _rag_config
```

## Step 5: Add Monitoring Endpoint

Add a new monitoring endpoint in `backend/src/backend/api/routes/` or extend existing routes:

```python
@router.get("/rag/status")
async def get_rag_status():
    """Get Enhanced RAG system status and metrics."""
    try:
        from ...core.cache import get_embedding_cache_manager, get_embedding_batch_processor
        from ...core.processing.chunking import get_chunk_optimizer
        from ...core.selection import get_tag_based_selector
        
        # Get component status
        cache_manager = get_embedding_cache_manager()
        batch_processor = get_embedding_batch_processor()
        optimizer = get_chunk_optimizer()
        selector = get_tag_based_selector()
        
        status = {
            "system_status": "operational",
            "cache_stats": cache_manager.get_cache_stats(),
            "batch_processor_stats": batch_processor.get_processing_stats(),
            "optimizer_stats": optimizer.get_performance_summary(),
            "selector_config": {
                "max_documents": selector.max_documents,
                "semantic_scoring_enabled": selector.enable_semantic_scoring,
                "scoring_weights": selector.scoring_weights
            },
            "timestamp": time.time()
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Failed to get RAG status: {e}")
        return {
            "system_status": "error",
            "error": str(e),
            "timestamp": time.time()
        }

@router.post("/rag/cache/warm")
async def warm_rag_cache(documents: List[str]):
    """Warm the RAG cache with specific documents."""
    try:
        from ...core.cache import get_embedding_batch_processor
        from ...core.processing.chunking import get_smart_chunker
        from ...core.cache.embedding_batch_processor import BatchItem
        
        chunker = get_smart_chunker()
        batch_processor = get_embedding_batch_processor()
        
        # Process documents for cache warming
        sample_items = []
        for doc_path in documents[:10]:  # Limit to 10 docs for warming
            try:
                with open(doc_path, 'r', encoding='utf-8') as f:
                    content = f.read()[:1000]  # Sample content
                
                sample_items.append(BatchItem(
                    content=content,
                    model_name="default",
                    content_type="text",
                    document_path=doc_path
                ))
            except Exception as e:
                logger.warning(f"Could not sample {doc_path} for warming: {e}")
        
        if sample_items:
            warmed_count = await batch_processor.warm_up_cache(sample_items)
            return {
                "status": "success",
                "warmed_items": warmed_count,
                "message": f"Cache warmed with {warmed_count} items"
            }
        else:
            return {
                "status": "warning",
                "warmed_items": 0,
                "message": "No items available for cache warming"
            }
            
    except Exception as e:
        logger.error(f"Cache warming failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }
```

## Step 6: Initialize on Startup

Update `backend/main.py` to initialize the Enhanced RAG system:

```python
# Add imports
from src.backend.core.config.rag_config import get_rag_config
from src.backend.core.cache import get_embedding_cache_manager

@app.on_event("startup")
async def startup_event():
    """Initialize Enhanced RAG system on startup."""
    try:
        # Load and validate configuration
        rag_config = get_rag_config()
        logger.info(f"Enhanced RAG system enabled: {rag_config.enable_enhanced_rag}")
        
        if rag_config.enable_enhanced_rag:
            # Initialize cache manager (will trigger cache warming if enabled)
            cache_manager = get_embedding_cache_manager()
            logger.info("Enhanced RAG cache manager initialized")
            
            # Create data directory if it doesn't exist
            import os
            os.makedirs(os.path.dirname(rag_config.embedding_cache_db_path), exist_ok=True)
            
            logger.info("Enhanced RAG system startup completed")
        
    except Exception as e:
        logger.error(f"Enhanced RAG system startup failed: {e}")
        # System should still start without Enhanced RAG
```

## Step 7: Testing the Integration

Create a simple test to verify the integration:

```python
# test_enhanced_rag_integration.py
import asyncio
import tempfile
import os

async def test_basic_integration():
    """Test basic Enhanced RAG functionality."""
    
    # Create a test document
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("""
        This is a test document for the Enhanced RAG system.
        It contains multiple paragraphs to test chunking.
        
        The system should be able to:
        1. Extract content efficiently
        2. Create intelligent chunks
        3. Generate embeddings
        4. Provide semantic scoring
        
        This demonstrates the enhanced capabilities of the new RAG implementation.
        """)
        test_file = f.name
    
    try:
        from src.backend.core.processing.chunking import get_smart_chunker
        from src.backend.core.cache import get_embedding_batch_processor
        from src.backend.core.cache.embedding_batch_processor import BatchItem
        
        # Test chunking
        chunker = get_smart_chunker()
        chunks = chunker.chunk_document_from_file(test_file)
        print(f"Created {len(chunks)} chunks")
        
        # Test batch processing
        batch_processor = get_embedding_batch_processor()
        batch_items = [
            BatchItem(chunk.content, "default", chunk.chunk_type)
            for chunk in chunks[:3]  # Test with first 3 chunks
        ]
        
        result = await batch_processor.process_batch_items(batch_items)
        print(f"Processed {result.successful_items} embeddings")
        
        print("Enhanced RAG integration test passed!")
        
    finally:
        # Cleanup
        os.unlink(test_file)

if __name__ == "__main__":
    asyncio.run(test_basic_integration())
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all dependencies are installed and the Python path includes the backend source directory.

2. **Database Errors**: Ensure the data directory exists and has write permissions for the SQLite cache database.

3. **Memory Issues**: Adjust `MAX_MEMORY_USAGE_MB` and `MAX_BATCH_SIZE` in your environment configuration based on available system resources.

4. **Performance Issues**: Enable logging to monitor cache hit rates and adjust batch sizes accordingly.

### Performance Tuning

1. **Cache Hit Rate**: Monitor cache hit rates and increase cache size if rates are below 80%.

2. **Batch Sizes**: Start with smaller batch sizes (20-30) and increase based on system performance.

3. **Scoring Weights**: Adjust scoring weights based on your use case - increase semantic similarity weight for query-based retrieval.

## Migration Notes

- The Enhanced RAG system is designed to be backward compatible
- Existing functionality will continue to work without changes
- Enhanced features are opt-in through configuration
- Performance improvements are automatic when enabled

## Next Steps

1. Monitor system performance and adjust configuration as needed
2. Experiment with different scoring weights for your use case
3. Consider implementing custom embedding models for domain-specific content
4. Add custom chunk processing strategies for specialized document types

This integration guide provides a comprehensive path to enable the Enhanced RAG system while maintaining backward compatibility with existing functionality.
