"""Chunk optimization for performance and memory management."""
import logging
import asyncio
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import psutil
import time

from .smart_chunker import DocumentChunk, SmartChunker

logger = logging.getLogger(__name__)

@dataclass
class ChunkOptimizationConfig:
    """Configuration for chunk optimization."""
    max_memory_usage_mb: int = 500  # Maximum memory usage for chunk processing
    max_concurrent_chunks: int = 10  # Maximum chunks to process concurrently
    chunk_cache_size: int = 100  # Number of chunks to keep in memory cache
    optimization_strategy: str = "balanced"  # balanced, speed, memory
    enable_compression: bool = True  # Compress chunks in cache
    target_response_time_ms: int = 3000  # Target response time in milliseconds
    
    # Performance thresholds
    memory_pressure_threshold: float = 0.8  # Memory usage threshold to trigger optimization
    chunk_size_variance_threshold: float = 0.3  # Acceptable variance in chunk sizes
    semantic_score_threshold: float = 0.7  # Minimum acceptable semantic score

@dataclass
class OptimizationMetrics:
    """Metrics for chunk optimization performance."""
    total_chunks: int = 0
    processing_time_ms: float = 0
    memory_usage_mb: float = 0
    cache_hit_ratio: float = 0
    average_semantic_score: float = 0
    chunk_size_variance: float = 0
    optimization_suggestions: List[str] = field(default_factory=list)

class ChunkOptimizer:
    """Optimizes chunk processing for performance and memory efficiency."""
    
    def __init__(self, config: Optional[ChunkOptimizationConfig] = None):
        """Initialize the chunk optimizer.
        
        Args:
            config: Optimization configuration
        """
        self.config = config or ChunkOptimizationConfig()
        self.chunker = SmartChunker()
        
        # Performance tracking
        self.chunk_cache: Dict[str, DocumentChunk] = {}
        self.performance_history: List[OptimizationMetrics] = []
        self.processing_stats: Dict[str, List[float]] = {
            "chunk_times": [],
            "memory_usage": [],
            "cache_hits": []
        }
        
        logger.info(f"Chunk optimizer initialized with strategy: {self.config.optimization_strategy}")
    
    async def optimize_chunks(
        self, 
        chunks: List[DocumentChunk],
        document_path: str,
        optimization_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[DocumentChunk], OptimizationMetrics]:
        """Optimize a list of chunks for performance and memory efficiency.
        
        Args:
            chunks: List of chunks to optimize
            document_path: Path to the original document
            optimization_context: Additional context for optimization decisions
            
        Returns:
            Tuple of (optimized_chunks, optimization_metrics)
        """
        start_time = time.time()
        initial_memory = self._get_memory_usage()
        
        logger.info(f"Optimizing {len(chunks)} chunks for document: {document_path}")
        
        # Apply optimization strategy
        if self.config.optimization_strategy == "speed":
            optimized_chunks = await self._optimize_for_speed(chunks, optimization_context)
        elif self.config.optimization_strategy == "memory":
            optimized_chunks = await self._optimize_for_memory(chunks, optimization_context)
        else:  # balanced
            optimized_chunks = await self._optimize_balanced(chunks, optimization_context)
        
        # Calculate metrics
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        final_memory = self._get_memory_usage()
        
        metrics = self._calculate_optimization_metrics(
            original_chunks=chunks,
            optimized_chunks=optimized_chunks,
            processing_time_ms=processing_time,
            memory_delta_mb=final_memory - initial_memory
        )
        
        # Update performance history
        self.performance_history.append(metrics)
        self._update_processing_stats(metrics)
        
        logger.info(
            f"Chunk optimization completed: {len(optimized_chunks)} chunks, "
            f"{processing_time:.2f}ms, {metrics.memory_usage_mb:.2f}MB"
        )
        
        return optimized_chunks, metrics
    
    async def _optimize_for_speed(
        self, 
        chunks: List[DocumentChunk],
        context: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """Optimize chunks prioritizing processing speed."""
        optimized_chunks = []
        
        # Use concurrent processing
        semaphore = asyncio.Semaphore(self.config.max_concurrent_chunks)
        
        async def process_chunk(chunk: DocumentChunk) -> DocumentChunk:
            async with semaphore:
                return await self._optimize_single_chunk(chunk, priority="speed")
        
        # Process chunks concurrently
        tasks = [process_chunk(chunk) for chunk in chunks]
        optimized_chunks = await asyncio.gather(*tasks)
        
        # Sort by original index to maintain order
        optimized_chunks.sort(key=lambda x: x.chunk_index)
        
        return optimized_chunks
    
    async def _optimize_for_memory(
        self, 
        chunks: List[DocumentChunk],
        context: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """Optimize chunks prioritizing memory efficiency."""
        optimized_chunks = []
        
        # Process chunks sequentially to minimize memory usage
        for chunk in chunks:
            # Check memory pressure
            if self._is_memory_pressure_high():
                # Apply aggressive memory optimization
                optimized_chunk = await self._optimize_single_chunk(chunk, priority="memory")
                # Compress chunk content if enabled
                if self.config.enable_compression:
                    optimized_chunk = self._compress_chunk(optimized_chunk)
            else:
                optimized_chunk = await self._optimize_single_chunk(chunk, priority="balanced")
            
            optimized_chunks.append(optimized_chunk)
            
            # Clear cache if memory pressure is high
            if self._is_memory_pressure_high():
                self._clear_chunk_cache()
        
        return optimized_chunks
    
    async def _optimize_balanced(
        self, 
        chunks: List[DocumentChunk],
        context: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """Optimize chunks balancing speed and memory efficiency."""
        optimized_chunks = []
        
        # Determine batch size based on available memory
        batch_size = self._calculate_optimal_batch_size(chunks)
        
        # Process chunks in batches
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            
            # Check if we should prioritize memory or speed for this batch
            if self._is_memory_pressure_high():
                batch_optimized = await self._optimize_for_memory(batch, context)
            else:
                batch_optimized = await self._optimize_for_speed(batch, context)
            
            optimized_chunks.extend(batch_optimized)
            
            # Brief pause between batches to allow garbage collection
            await asyncio.sleep(0.001)
        
        return optimized_chunks
    
    async def _optimize_single_chunk(
        self, 
        chunk: DocumentChunk, 
        priority: str = "balanced"
    ) -> DocumentChunk:
        """Optimize a single chunk based on priority."""
        # Check cache first
        cache_key = self._get_chunk_cache_key(chunk)
        if cache_key in self.chunk_cache:
            self.processing_stats["cache_hits"].append(1.0)
            return self.chunk_cache[cache_key]
        
        self.processing_stats["cache_hits"].append(0.0)
        
        # Apply optimization based on priority
        optimized_chunk = chunk
        
        if priority == "speed":
            # Optimize for faster processing
            optimized_chunk = self._optimize_chunk_for_speed(chunk)
        elif priority == "memory":
            # Optimize for lower memory usage
            optimized_chunk = self._optimize_chunk_for_memory(chunk)
        else:  # balanced
            # Apply balanced optimizations
            optimized_chunk = self._optimize_chunk_balanced(chunk)
        
        # Cache the optimized chunk if cache has space
        if len(self.chunk_cache) < self.config.chunk_cache_size:
            self.chunk_cache[cache_key] = optimized_chunk
        
        return optimized_chunk
    
    def _optimize_chunk_for_speed(self, chunk: DocumentChunk) -> DocumentChunk:
        """Optimize chunk for faster processing."""
        # Create a copy to avoid modifying original
        optimized = DocumentChunk(
            content=chunk.content,
            chunk_index=chunk.chunk_index,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            token_count=chunk.token_count,
            chunk_type=chunk.chunk_type,
            metadata=chunk.metadata.copy(),
            overlap_with_previous=chunk.overlap_with_previous,
            overlap_with_next=chunk.overlap_with_next,
            semantic_score=chunk.semantic_score
        )
        
        # Add speed-optimized metadata
        optimized.metadata.update({
            "optimization_strategy": "speed",
            "processing_priority": "high",
            "cache_eligible": True
        })
        
        return optimized
    
    def _optimize_chunk_for_memory(self, chunk: DocumentChunk) -> DocumentChunk:
        """Optimize chunk for lower memory usage."""
        # Create a memory-optimized copy
        optimized = DocumentChunk(
            content=chunk.content,
            chunk_index=chunk.chunk_index,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            token_count=chunk.token_count,
            chunk_type=chunk.chunk_type,
            metadata={},  # Minimal metadata for memory efficiency
            overlap_with_previous=chunk.overlap_with_previous,
            overlap_with_next=chunk.overlap_with_next,
            semantic_score=chunk.semantic_score
        )
        
        # Add only essential metadata
        optimized.metadata.update({
            "optimization_strategy": "memory",
            "compressed": self.config.enable_compression
        })
        
        return optimized
    
    def _optimize_chunk_balanced(self, chunk: DocumentChunk) -> DocumentChunk:
        """Apply balanced optimizations to chunk."""
        # Create a balanced copy
        optimized = DocumentChunk(
            content=chunk.content,
            chunk_index=chunk.chunk_index,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            token_count=chunk.token_count,
            chunk_type=chunk.chunk_type,
            metadata=chunk.metadata.copy(),
            overlap_with_previous=chunk.overlap_with_previous,
            overlap_with_next=chunk.overlap_with_next,
            semantic_score=chunk.semantic_score
        )
        
        # Apply balanced optimizations
        optimized.metadata.update({
            "optimization_strategy": "balanced",
            "processing_priority": "normal",
            "cache_eligible": True
        })
        
        # Optimize content if it's very large
        if len(chunk.content) > 10000:  # Large chunk threshold
            optimized = self._trim_chunk_whitespace(optimized)
        
        return optimized
    
    def _compress_chunk(self, chunk: DocumentChunk) -> DocumentChunk:
        """Apply compression to chunk content."""
        if not self.config.enable_compression:
            return chunk
        
        # Simple compression: remove excessive whitespace
        compressed_content = self._normalize_whitespace(chunk.content)
        
        compressed_chunk = DocumentChunk(
            content=compressed_content,
            chunk_index=chunk.chunk_index,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            token_count=chunk.token_count,  # Keep original token count
            chunk_type=chunk.chunk_type,
            metadata=chunk.metadata.copy(),
            overlap_with_previous=chunk.overlap_with_previous,
            overlap_with_next=chunk.overlap_with_next,
            semantic_score=chunk.semantic_score
        )
        
        compressed_chunk.metadata["compressed"] = True
        compressed_chunk.metadata["compression_ratio"] = len(compressed_content) / len(chunk.content)
        
        return compressed_chunk
    
    def _trim_chunk_whitespace(self, chunk: DocumentChunk) -> DocumentChunk:
        """Trim excessive whitespace from chunk content."""
        trimmed_content = self._normalize_whitespace(chunk.content)
        
        trimmed_chunk = DocumentChunk(
            content=trimmed_content,
            chunk_index=chunk.chunk_index,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            token_count=chunk.token_count,
            chunk_type=chunk.chunk_type,
            metadata=chunk.metadata.copy(),
            overlap_with_previous=chunk.overlap_with_previous,
            overlap_with_next=chunk.overlap_with_next,
            semantic_score=chunk.semantic_score
        )
        
        trimmed_chunk.metadata["whitespace_trimmed"] = True
        
        return trimmed_chunk
    
    def _normalize_whitespace(self, content: str) -> str:
        """Normalize whitespace in content."""
        # Replace multiple consecutive spaces with single space
        import re
        normalized = re.sub(r' {2,}', ' ', content)
        # Replace multiple consecutive newlines with double newline
        normalized = re.sub(r'\n{3,}', '\n\n', normalized)
        return normalized.strip()
    
    def _calculate_optimal_batch_size(self, chunks: List[DocumentChunk]) -> int:
        """Calculate optimal batch size based on available memory and chunk sizes."""
        if not chunks:
            return 1
        
        # Estimate memory usage per chunk
        avg_chunk_size = sum(len(chunk.content) for chunk in chunks) / len(chunks)
        estimated_memory_per_chunk = avg_chunk_size * 2  # Rough estimate including overhead
        
        # Calculate how many chunks we can process given memory constraints
        available_memory = self.config.max_memory_usage_mb * 1024 * 1024  # Convert to bytes
        max_chunks = max(1, int(available_memory / estimated_memory_per_chunk))
        
        # Don't exceed configured concurrent limit
        return min(max_chunks, self.config.max_concurrent_chunks)
    
    def _is_memory_pressure_high(self) -> bool:
        """Check if system is under memory pressure."""
        try:
            memory_percent = psutil.virtual_memory().percent / 100.0
            return memory_percent > self.config.memory_pressure_threshold
        except Exception:
            # If we can't get memory info, assume no pressure
            return False
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB."""
        try:
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024  # Convert to MB
        except Exception:
            return 0.0
    
    def _get_chunk_cache_key(self, chunk: DocumentChunk) -> str:
        """Generate cache key for chunk."""
        import hashlib
        content_hash = hashlib.md5(chunk.content.encode()).hexdigest()
        return f"{chunk.chunk_type}_{content_hash}_{chunk.token_count}"
    
    def _clear_chunk_cache(self):
        """Clear the chunk cache to free memory."""
        cleared_count = len(self.chunk_cache)
        self.chunk_cache.clear()
        logger.info(f"Cleared chunk cache: {cleared_count} items removed")
    
    def _calculate_optimization_metrics(
        self,
        original_chunks: List[DocumentChunk],
        optimized_chunks: List[DocumentChunk],
        processing_time_ms: float,
        memory_delta_mb: float
    ) -> OptimizationMetrics:
        """Calculate optimization performance metrics."""
        metrics = OptimizationMetrics()
        
        metrics.total_chunks = len(optimized_chunks)
        metrics.processing_time_ms = processing_time_ms
        metrics.memory_usage_mb = memory_delta_mb
        
        # Calculate cache hit ratio
        if self.processing_stats["cache_hits"]:
            metrics.cache_hit_ratio = sum(self.processing_stats["cache_hits"]) / len(self.processing_stats["cache_hits"])
        
        # Calculate average semantic score
        if optimized_chunks:
            metrics.average_semantic_score = sum(chunk.semantic_score for chunk in optimized_chunks) / len(optimized_chunks)
        
        # Calculate chunk size variance
        if len(optimized_chunks) > 1:
            token_counts = [chunk.token_count for chunk in optimized_chunks]
            mean_tokens = sum(token_counts) / len(token_counts)
            variance = sum((count - mean_tokens) ** 2 for count in token_counts) / len(token_counts)
            metrics.chunk_size_variance = variance / mean_tokens if mean_tokens > 0 else 0
        
        # Generate optimization suggestions
        metrics.optimization_suggestions = self._generate_optimization_suggestions(
            original_chunks, optimized_chunks, metrics
        )
        
        return metrics
    
    def _generate_optimization_suggestions(
        self,
        original_chunks: List[DocumentChunk],
        optimized_chunks: List[DocumentChunk],
        metrics: OptimizationMetrics
    ) -> List[str]:
        """Generate suggestions for further optimization."""
        suggestions = []
        
        # Check processing time
        if metrics.processing_time_ms > self.config.target_response_time_ms:
            suggestions.append("Consider reducing chunk size or enabling more aggressive caching")
        
        # Check memory usage
        if metrics.memory_usage_mb > self.config.max_memory_usage_mb:
            suggestions.append("Enable compression or reduce concurrent chunk processing")
        
        # Check semantic score
        if metrics.average_semantic_score < self.config.semantic_score_threshold:
            suggestions.append("Consider using semantic chunking strategy for better boundary preservation")
        
        # Check chunk size variance
        if metrics.chunk_size_variance > self.config.chunk_size_variance_threshold:
            suggestions.append("High chunk size variance detected, consider adaptive chunking")
        
        # Check cache hit ratio
        if metrics.cache_hit_ratio < 0.3:
            suggestions.append("Low cache hit ratio, consider increasing cache size")
        
        return suggestions
    
    def _update_processing_stats(self, metrics: OptimizationMetrics):
        """Update processing statistics with new metrics."""
        self.processing_stats["chunk_times"].append(metrics.processing_time_ms)
        self.processing_stats["memory_usage"].append(metrics.memory_usage_mb)
        
        # Keep only recent history (last 100 entries)
        for key in self.processing_stats:
            if len(self.processing_stats[key]) > 100:
                self.processing_stats[key] = self.processing_stats[key][-100:]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get summary of optimization performance."""
        if not self.performance_history:
            return {"status": "no_data"}
        
        recent_metrics = self.performance_history[-10:]  # Last 10 optimization runs
        
        return {
            "total_optimizations": len(self.performance_history),
            "average_processing_time_ms": sum(m.processing_time_ms for m in recent_metrics) / len(recent_metrics),
            "average_memory_usage_mb": sum(m.memory_usage_mb for m in recent_metrics) / len(recent_metrics),
            "average_cache_hit_ratio": sum(m.cache_hit_ratio for m in recent_metrics) / len(recent_metrics),
            "average_semantic_score": sum(m.average_semantic_score for m in recent_metrics) / len(recent_metrics),
            "current_cache_size": len(self.chunk_cache),
            "configuration": {
                "strategy": self.config.optimization_strategy,
                "max_memory_mb": self.config.max_memory_usage_mb,
                "max_concurrent_chunks": self.config.max_concurrent_chunks,
                "cache_size": self.config.chunk_cache_size
            }
        }

# Global optimizer instance
_chunk_optimizer: Optional[ChunkOptimizer] = None

def get_chunk_optimizer(config: Optional[ChunkOptimizationConfig] = None) -> ChunkOptimizer:
    """Get or create the global chunk optimizer instance."""
    global _chunk_optimizer
    if _chunk_optimizer is None:
        _chunk_optimizer = ChunkOptimizer(config)
    return _chunk_optimizer
