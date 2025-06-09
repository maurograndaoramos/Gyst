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
    gemini_embedding_model: str = "models/text-embedding-004"
    embedding_retry_attempts: int = 3
    embedding_timeout_seconds: int = 30
    gemini_request_delay_ms: int = 100
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
        """Create configuration from environment variables (with RAG_ prefix to avoid conflicts)."""
        return cls(
            enable_enhanced_rag=os.getenv("RAG_ENABLE_ENHANCED_RAG", "true").lower() == "true",
            enable_semantic_scoring=os.getenv("RAG_ENABLE_SEMANTIC_SCORING", "true").lower() == "true",
            cache_warming_enabled=os.getenv("RAG_CACHE_WARMING_ENABLED", "true").lower() == "true",
            adaptive_batching=os.getenv("RAG_ADAPTIVE_BATCHING", "true").lower() == "true",
            
            gemini_embedding_model=os.getenv("RAG_GEMINI_EMBEDDING_MODEL", "models/text-embedding-004"),
            embedding_retry_attempts=int(os.getenv("RAG_EMBEDDING_RETRY_ATTEMPTS", "3")),
            embedding_timeout_seconds=int(os.getenv("RAG_EMBEDDING_TIMEOUT_SECONDS", "30")),
            gemini_request_delay_ms=int(os.getenv("RAG_GEMINI_REQUEST_DELAY_MS", "100")),
            max_chunk_size=int(os.getenv("RAG_MAX_CHUNK_SIZE", "512")),
            chunk_overlap_ratio=float(os.getenv("RAG_CHUNK_OVERLAP_RATIO", "0.2")),
            
            embedding_cache_db_path=os.getenv("RAG_EMBEDDING_CACHE_DB_PATH", "./data/embedding_cache.db"),
            cache_ttl_seconds=int(os.getenv("RAG_CACHE_TTL_SECONDS", "86400")),
            max_memory_usage_mb=int(os.getenv("RAG_MAX_MEMORY_USAGE_MB", "500")),
            chunk_cache_size=int(os.getenv("RAG_CHUNK_CACHE_SIZE", "100")),
            
            max_batch_size=int(os.getenv("RAG_MAX_BATCH_SIZE", "50")),
            max_concurrent_batches=int(os.getenv("RAG_MAX_CONCURRENT_BATCHES", "3")),
            memory_pressure_threshold=float(os.getenv("RAG_MEMORY_PRESSURE_THRESHOLD", "0.8")),
            max_documents_per_query=int(os.getenv("RAG_MAX_DOCUMENTS_PER_QUERY", "5")),
            
            tag_similarity_weight=float(os.getenv("RAG_TAG_SIMILARITY_WEIGHT", "0.4")),
            semantic_similarity_weight=float(os.getenv("RAG_SEMANTIC_SIMILARITY_WEIGHT", "0.3")),
            content_relevance_weight=float(os.getenv("RAG_CONTENT_RELEVANCE_WEIGHT", "0.2")),
            structural_quality_weight=float(os.getenv("RAG_STRUCTURAL_QUALITY_WEIGHT", "0.05")),
            freshness_weight=float(os.getenv("RAG_FRESHNESS_WEIGHT", "0.05"))
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
    
    def get_chunking_config(self) -> dict:
        """Get chunking-specific configuration."""
        return {
            "max_chunk_size": self.max_chunk_size,
            "overlap_ratio": self.chunk_overlap_ratio,
            "adaptive_sizing": self.adaptive_batching
        }
    
    def get_cache_config(self) -> dict:
        """Get caching-specific configuration."""
        return {
            "db_path": self.embedding_cache_db_path,
            "ttl_seconds": self.cache_ttl_seconds,
            "max_memory_mb": self.max_memory_usage_mb,
            "cache_size": self.chunk_cache_size,
            "warming_enabled": self.cache_warming_enabled
        }
    
    def get_scoring_weights(self) -> dict:
        """Get scoring weights configuration."""
        return {
            "tag_similarity": self.tag_similarity_weight,
            "semantic_similarity": self.semantic_similarity_weight,
            "content_relevance": self.content_relevance_weight,
            "structural_quality": self.structural_quality_weight,
            "freshness": self.freshness_weight
        }

# Global configuration instance
_rag_config: Optional[EnhancedRAGConfig] = None

def get_rag_config() -> EnhancedRAGConfig:
    """Get or create the global RAG configuration."""
    global _rag_config
    if _rag_config is None:
        _rag_config = EnhancedRAGConfig.from_env()
        _rag_config.validate()
    return _rag_config

def reload_rag_config() -> EnhancedRAGConfig:
    """Reload RAG configuration from environment."""
    global _rag_config
    _rag_config = EnhancedRAGConfig.from_env()
    _rag_config.validate()
    return _rag_config
