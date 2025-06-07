"""Chunking components for intelligent document processing."""

from .smart_chunker import SmartChunker, ChunkingStrategy, DocumentChunk
from .chunk_optimizer import ChunkOptimizer, ChunkOptimizationConfig
from .content_extractor import ContentExtractor, ExtractionMetadata

# Global instances
_smart_chunker = None
_chunk_optimizer = None
_content_extractor = None

def get_smart_chunker() -> SmartChunker:
    """Get or create the global smart chunker instance."""
    global _smart_chunker
    if _smart_chunker is None:
        _smart_chunker = SmartChunker()
    return _smart_chunker

def get_chunk_optimizer() -> ChunkOptimizer:
    """Get or create the global chunk optimizer instance."""
    global _chunk_optimizer
    if _chunk_optimizer is None:
        _chunk_optimizer = ChunkOptimizer()
    return _chunk_optimizer

def get_content_extractor() -> ContentExtractor:
    """Get or create the global content extractor instance."""
    global _content_extractor
    if _content_extractor is None:
        _content_extractor = ContentExtractor()
    return _content_extractor

def reset_chunking_components():
    """Reset all global chunking component instances (useful for testing)."""
    global _smart_chunker, _chunk_optimizer, _content_extractor
    _smart_chunker = None
    _chunk_optimizer = None
    _content_extractor = None

__all__ = [
    "SmartChunker",
    "ChunkingStrategy", 
    "DocumentChunk",
    "ChunkOptimizer",
    "ChunkOptimizationConfig",
    "ContentExtractor",
    "ExtractionMetadata",
    "get_smart_chunker",
    "get_chunk_optimizer",
    "get_content_extractor",
    "reset_chunking_components"
]
