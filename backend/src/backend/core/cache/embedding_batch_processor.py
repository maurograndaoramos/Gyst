"""Embedding batch processor for efficient embedding generation and caching."""
import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Tuple, Callable
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
import threading

from .embedding_cache_manager import EmbeddingCacheManager, get_embedding_cache_manager

logger = logging.getLogger(__name__)

@dataclass
class BatchProcessingConfig:
    """Configuration for embedding batch processing."""
    max_batch_size: int = 50  # Maximum items per batch
    max_concurrent_batches: int = 3  # Maximum concurrent batches
    batch_timeout_seconds: int = 30  # Timeout for batch processing
    retry_attempts: int = 3  # Number of retry attempts for failed items
    adaptive_batching: bool = True  # Dynamically adjust batch sizes
    cache_results: bool = True  # Cache generated embeddings
    parallel_processing: bool = True  # Process batches in parallel

@dataclass
class BatchItem:
    """Represents an item to be processed in a batch."""
    content: str
    model_name: str
    content_type: str = "text"
    chunk_index: Optional[int] = None
    document_path: Optional[str] = None
    token_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BatchResult:
    """Result of batch processing."""
    batch_id: str
    total_items: int
    successful_items: int
    failed_items: int
    cached_items: int
    processing_time_seconds: float
    embeddings: Dict[str, List[float]]  # Maps content hash to embedding
    errors: List[Dict[str, Any]]
    cache_stats: Dict[str, Any]

class EmbeddingBatchProcessor:
    """Processes embedding requests in optimized batches."""
    
    def __init__(
        self, 
        config: Optional[BatchProcessingConfig] = None,
        cache_manager: Optional[EmbeddingCacheManager] = None,
        embedding_function: Optional[Callable] = None
    ):
        """Initialize embedding batch processor.
        
        Args:
            config: Batch processing configuration
            cache_manager: Embedding cache manager instance
            embedding_function: Function to generate embeddings
        """
        self.config = config or BatchProcessingConfig()
        self.cache_manager = cache_manager or get_embedding_cache_manager()
        self.embedding_function = embedding_function or self._default_embedding_function
        
        # Batch management
        self.pending_batches: Dict[str, List[BatchItem]] = {}
        self.processing_batches: Dict[str, asyncio.Task] = {}
        self.batch_lock = threading.Lock()
        
        # Performance tracking
        self.stats = {
            "total_batches": 0,
            "total_items_processed": 0,
            "total_cache_hits": 0,
            "total_cache_misses": 0,
            "average_batch_size": 0,
            "average_processing_time": 0,
            "error_rate": 0
        }
        
        # Adaptive batching
        self.batch_performance_history: List[Dict[str, float]] = []
        self.optimal_batch_size = self.config.max_batch_size
        
        logger.info(f"Embedding batch processor initialized with max batch size: {self.config.max_batch_size}")
    
    async def process_batch_items(
        self, 
        items: List[BatchItem],
        batch_id: Optional[str] = None
    ) -> BatchResult:
        """Process a batch of embedding items.
        
        Args:
            items: List of items to process
            batch_id: Optional batch identifier
            
        Returns:
            BatchResult with processing results
        """
        import uuid
        
        batch_id = batch_id or str(uuid.uuid4())[:8]
        start_time = time.time()
        
        logger.info(f"Processing batch {batch_id} with {len(items)} items")
        
        # Check cache first
        cache_hits, cache_misses = await self._check_cache_batch(items)
        
        # Process cache misses
        generated_embeddings = {}
        errors = []
        
        if cache_misses:
            try:
                generated_embeddings, batch_errors = await self._generate_embeddings_batch(
                    cache_misses, batch_id
                )
                errors.extend(batch_errors)
                
                # Cache new embeddings
                if self.config.cache_results and generated_embeddings:
                    await self._cache_embeddings_batch(cache_misses, generated_embeddings)
                
            except Exception as e:
                logger.error(f"Batch {batch_id} processing failed: {str(e)}")
                errors.append({
                    "batch_id": batch_id,
                    "error": "BatchProcessingError",
                    "message": str(e),
                    "items": [item.content[:50] + "..." for item in cache_misses]
                })
        
        # Combine results
        all_embeddings = {**cache_hits, **generated_embeddings}
        
        processing_time = time.time() - start_time
        
        # Create batch result
        result = BatchResult(
            batch_id=batch_id,
            total_items=len(items),
            successful_items=len(all_embeddings),
            failed_items=len(errors),
            cached_items=len(cache_hits),
            processing_time_seconds=processing_time,
            embeddings=all_embeddings,
            errors=errors,
            cache_stats=self.cache_manager.get_cache_stats()
        )
        
        # Update statistics
        self._update_stats(result)
        
        # Update adaptive batching
        if self.config.adaptive_batching:
            self._update_batch_performance(len(items), processing_time, len(errors))
        
        logger.info(
            f"Batch {batch_id} completed: {result.successful_items}/{result.total_items} successful, "
            f"{result.cached_items} cached, {processing_time:.2f}s"
        )
        
        return result
    
    async def process_streaming_batch(
        self, 
        items: List[BatchItem],
        progress_callback: Optional[Callable] = None
    ) -> BatchResult:
        """Process batch with streaming progress updates.
        
        Args:
            items: List of items to process
            progress_callback: Optional callback for progress updates
            
        Returns:
            BatchResult with processing results
        """
        import uuid
        
        batch_id = str(uuid.uuid4())[:8]
        
        # Split into smaller chunks for streaming progress
        chunk_size = min(self.config.max_batch_size // 2, 20)
        chunks = [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]
        
        all_embeddings = {}
        all_errors = []
        total_cached = 0
        start_time = time.time()
        
        for i, chunk in enumerate(chunks):
            try:
                chunk_result = await self.process_batch_items(chunk, f"{batch_id}_chunk_{i}")
                
                # Merge results
                all_embeddings.update(chunk_result.embeddings)
                all_errors.extend(chunk_result.errors)
                total_cached += chunk_result.cached_items
                
                # Progress callback
                if progress_callback:
                    progress = (i + 1) / len(chunks)
                    await progress_callback({
                        "batch_id": batch_id,
                        "progress": progress,
                        "processed_items": len(all_embeddings),
                        "total_items": len(items),
                        "current_chunk": i + 1,
                        "total_chunks": len(chunks)
                    })
                
            except Exception as e:
                logger.error(f"Chunk {i} processing failed: {str(e)}")
                all_errors.append({
                    "chunk_id": f"{batch_id}_chunk_{i}",
                    "error": "ChunkProcessingError",
                    "message": str(e)
                })
        
        processing_time = time.time() - start_time
        
        return BatchResult(
            batch_id=batch_id,
            total_items=len(items),
            successful_items=len(all_embeddings),
            failed_items=len(all_errors),
            cached_items=total_cached,
            processing_time_seconds=processing_time,
            embeddings=all_embeddings,
            errors=all_errors,
            cache_stats=self.cache_manager.get_cache_stats()
        )
    
    async def _check_cache_batch(
        self, 
        items: List[BatchItem]
    ) -> Tuple[Dict[str, List[float]], List[BatchItem]]:
        """Check cache for batch items.
        
        Returns:
            Tuple of (cache_hits_dict, cache_misses_list)
        """
        # Prepare cache lookup data
        contents_and_models = [(item.content, item.model_name) for item in items]
        
        # Batch cache lookup
        cache_results = await self.cache_manager.batch_get_embeddings(
            contents_and_models, 
            content_type=items[0].content_type if items else "text"
        )
        
        cache_hits = {}
        cache_misses = []
        
        for item, (content, model_name) in zip(items, contents_and_models):
            cache_key = self.cache_manager._generate_cache_key(content, model_name)
            
            if cache_results.get(cache_key) is not None:
                cache_hits[cache_key] = cache_results[cache_key]
                self.stats["total_cache_hits"] += 1
            else:
                cache_misses.append(item)
                self.stats["total_cache_misses"] += 1
        
        logger.debug(f"Cache check: {len(cache_hits)} hits, {len(cache_misses)} misses")
        return cache_hits, cache_misses
    
    async def _generate_embeddings_batch(
        self, 
        items: List[BatchItem],
        batch_id: str
    ) -> Tuple[Dict[str, List[float]], List[Dict[str, Any]]]:
        """Generate embeddings for batch items.
        
        Returns:
            Tuple of (embeddings_dict, errors_list)
        """
        embeddings = {}
        errors = []
        
        # Group items by model for efficient processing
        model_groups = {}
        for item in items:
            if item.model_name not in model_groups:
                model_groups[item.model_name] = []
            model_groups[item.model_name].append(item)
        
        # Process each model group
        for model_name, model_items in model_groups.items():
            try:
                model_embeddings = await self._generate_model_embeddings(
                    model_items, model_name, batch_id
                )
                embeddings.update(model_embeddings)
                
            except Exception as e:
                logger.error(f"Model {model_name} processing failed in batch {batch_id}: {str(e)}")
                errors.append({
                    "batch_id": batch_id,
                    "model_name": model_name,
                    "error": "ModelProcessingError",
                    "message": str(e),
                    "item_count": len(model_items)
                })
        
        return embeddings, errors
    
    async def _generate_model_embeddings(
        self, 
        items: List[BatchItem],
        model_name: str,
        batch_id: str
    ) -> Dict[str, List[float]]:
        """Generate embeddings for items using specific model."""
        embeddings = {}
        
        # Extract content for embedding
        contents = [item.content for item in items]
        
        try:
            # Call embedding function (this would be your actual embedding API call)
            raw_embeddings = await self.embedding_function(contents, model_name)
            
            # Map back to cache keys
            for item, embedding in zip(items, raw_embeddings):
                cache_key = self.cache_manager._generate_cache_key(item.content, model_name)
                embeddings[cache_key] = embedding
            
            logger.debug(f"Generated {len(embeddings)} embeddings for model {model_name}")
            
        except Exception as e:
            logger.error(f"Embedding generation failed for model {model_name}: {str(e)}")
            raise
        
        return embeddings
    
    async def _cache_embeddings_batch(
        self, 
        items: List[BatchItem],
        embeddings: Dict[str, List[float]]
    ):
        """Cache generated embeddings in batch."""
        try:
            # Prepare data for batch caching
            cache_data = []
            
            for item in items:
                cache_key = self.cache_manager._generate_cache_key(item.content, item.model_name)
                
                if cache_key in embeddings:
                    cache_data.append({
                        "content": item.content,
                        "embedding": embeddings[cache_key],
                        "model_name": item.model_name,
                        "token_count": item.token_count,
                        "content_type": item.content_type,
                        "chunk_index": item.chunk_index,
                        "document_path": item.document_path
                    })
            
            # Batch cache
            if cache_data:
                cached_count = await self.cache_manager.batch_put_embeddings(cache_data)
                logger.debug(f"Cached {cached_count} embeddings")
            
        except Exception as e:
            logger.error(f"Batch caching failed: {str(e)}")
    
    async def _default_embedding_function(
        self, 
        contents: List[str], 
        model_name: str
    ) -> List[List[float]]:
        """Default embedding function (placeholder).
        
        In a real implementation, this would call your embedding API.
        """
        import random
        
        # Simulate embedding generation delay
        await asyncio.sleep(0.1 * len(contents))
        
        # Generate mock embeddings (replace with actual embedding API call)
        embeddings = []
        embedding_dim = 768  # Common embedding dimension
        
        for content in contents:
            # Create deterministic "embedding" based on content hash
            import hashlib
            content_hash = hashlib.md5(content.encode()).hexdigest()
            random.seed(int(content_hash[:8], 16))
            
            embedding = [random.uniform(-1, 1) for _ in range(embedding_dim)]
            embeddings.append(embedding)
        
        logger.debug(f"Generated {len(embeddings)} mock embeddings for model {model_name}")
        return embeddings
    
    def _update_stats(self, result: BatchResult):
        """Update processing statistics."""
        self.stats["total_batches"] += 1
        self.stats["total_items_processed"] += result.total_items
        
        # Update averages
        total_batches = self.stats["total_batches"]
        self.stats["average_batch_size"] = (
            (self.stats["average_batch_size"] * (total_batches - 1) + result.total_items) / total_batches
        )
        self.stats["average_processing_time"] = (
            (self.stats["average_processing_time"] * (total_batches - 1) + result.processing_time_seconds) / total_batches
        )
        
        # Update error rate
        total_items = self.stats["total_items_processed"]
        if total_items > 0:
            self.stats["error_rate"] = (
                self.stats.get("total_errors", 0) + result.failed_items
            ) / total_items
    
    def _update_batch_performance(self, batch_size: int, processing_time: float, error_count: int):
        """Update batch performance for adaptive sizing."""
        performance_score = batch_size / max(processing_time, 0.1) * (1 - min(error_count / batch_size, 1))
        
        self.batch_performance_history.append({
            "batch_size": batch_size,
            "processing_time": processing_time,
            "performance_score": performance_score,
            "error_count": error_count
        })
        
        # Keep only recent history
        if len(self.batch_performance_history) > 20:
            self.batch_performance_history = self.batch_performance_history[-20:]
        
        # Adjust optimal batch size
        if len(self.batch_performance_history) >= 5:
            recent_performance = self.batch_performance_history[-5:]
            avg_performance = sum(p["performance_score"] for p in recent_performance) / 5
            
            # Simple adaptive logic
            if avg_performance > 50:  # Good performance, try larger batches
                self.optimal_batch_size = min(
                    self.optimal_batch_size + 5,
                    self.config.max_batch_size
                )
            elif avg_performance < 20:  # Poor performance, try smaller batches
                self.optimal_batch_size = max(
                    self.optimal_batch_size - 5,
                    10
                )
    
    def get_optimal_batch_size(self) -> int:
        """Get current optimal batch size."""
        return self.optimal_batch_size if self.config.adaptive_batching else self.config.max_batch_size
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get comprehensive processing statistics."""
        cache_stats = self.cache_manager.get_cache_stats()
        
        return {
            "batch_processing": self.stats,
            "current_optimal_batch_size": self.optimal_batch_size,
            "cache_performance": {
                "total_hits": self.stats["total_cache_hits"],
                "total_misses": self.stats["total_cache_misses"],
                "hit_rate": self.stats["total_cache_hits"] / max(1, self.stats["total_cache_hits"] + self.stats["total_cache_misses"])
            },
            "cache_stats": cache_stats,
            "configuration": {
                "max_batch_size": self.config.max_batch_size,
                "adaptive_batching": self.config.adaptive_batching,
                "parallel_processing": self.config.parallel_processing,
                "cache_results": self.config.cache_results
            }
        }
    
    async def warm_up_cache(self, sample_items: List[BatchItem]) -> int:
        """Warm up cache with sample items."""
        if not sample_items:
            return 0
        
        logger.info(f"Warming up cache with {len(sample_items)} sample items")
        
        try:
            result = await self.process_batch_items(sample_items, "warmup")
            logger.info(f"Cache warm-up completed: {result.successful_items} items processed")
            return result.successful_items
        except Exception as e:
            logger.error(f"Cache warm-up failed: {str(e)}")
            return 0
    
    async def cleanup_resources(self):
        """Clean up processor resources."""
        # Cancel any pending batch tasks
        for batch_id, task in self.processing_batches.items():
            if not task.done():
                task.cancel()
                logger.info(f"Cancelled pending batch task: {batch_id}")
        
        self.processing_batches.clear()
        self.pending_batches.clear()
        
        logger.info("Embedding batch processor resources cleaned up")

# Global batch processor instance
_embedding_batch_processor: Optional[EmbeddingBatchProcessor] = None

def get_embedding_batch_processor(
    config: Optional[BatchProcessingConfig] = None,
    cache_manager: Optional[EmbeddingCacheManager] = None,
    embedding_function: Optional[Callable] = None
) -> EmbeddingBatchProcessor:
    """Get or create the global embedding batch processor instance."""
    global _embedding_batch_processor
    if _embedding_batch_processor is None:
        _embedding_batch_processor = EmbeddingBatchProcessor(config, cache_manager, embedding_function)
    return _embedding_batch_processor
