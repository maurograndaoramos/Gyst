"""Caching components for enhanced RAG performance."""

from .embedding_cache_manager import EmbeddingCacheManager, CacheConfig
from .cache_strategies import CacheStrategy, LRUCacheStrategy, TTLCacheStrategy
from .embedding_batch_processor import EmbeddingBatchProcessor, BatchProcessingConfig

# Global instances
_embedding_cache_manager = None
_embedding_batch_processor = None

def get_embedding_cache_manager() -> EmbeddingCacheManager:
    """Get or create the global embedding cache manager instance."""
    global _embedding_cache_manager
    if _embedding_cache_manager is None:
        _embedding_cache_manager = EmbeddingCacheManager()
    return _embedding_cache_manager

def get_embedding_batch_processor() -> EmbeddingBatchProcessor:
    """Get or create the global embedding batch processor instance."""
    global _embedding_batch_processor
    if _embedding_batch_processor is None:
        _embedding_batch_processor = EmbeddingBatchProcessor()
    return _embedding_batch_processor

def reset_cache_components():
    """Reset all global cache component instances (useful for testing)."""
    global _embedding_cache_manager, _embedding_batch_processor
    _embedding_cache_manager = None
    _embedding_batch_processor = None

__all__ = [
    "EmbeddingCacheManager",
    "CacheConfig", 
    "CacheStrategy",
    "LRUCacheStrategy",
    "TTLCacheStrategy",
    "EmbeddingBatchProcessor",
    "BatchProcessingConfig",
    "get_embedding_cache_manager",
    "get_embedding_batch_processor",
    "reset_cache_components"
]
