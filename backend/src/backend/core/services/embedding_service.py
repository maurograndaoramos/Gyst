"""Embedding Service - Handles embedding generation and management for Enhanced RAG (Gemini-only)."""
import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass

from ...gemini.client import client as gemini_client, GEMINI_MODEL
from ..cache import get_embedding_cache_manager
from ..config.rag_config import get_rag_config

logger = logging.getLogger(__name__)

@dataclass
class EmbeddingResult:
    """Result of embedding generation."""
    embedding: List[float]
    model_used: str
    cache_hit: bool
    generation_time: float
    token_count: int
    content_hash: str

@dataclass
class BatchEmbeddingResult:
    """Result of batch embedding generation."""
    embeddings: List[EmbeddingResult]
    successful_items: int
    failed_items: int
    total_time: float
    cache_hits: int
    cache_misses: int
    errors: List[str]

class EmbeddingService:
    """Service for managing embeddings with Gemini integration and caching."""
    
    def __init__(self):
        self.config = get_rag_config()
        self.cache_manager = get_embedding_cache_manager()
        self._stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "total_generation_time": 0.0,
            "errors": 0
        }
        
        logger.info("Embedding Service initialized successfully")
    
    async def generate_embedding(
        self,
        content: str,
        model: str = "default",
        content_type: str = "text",
        use_cache: bool = True
    ) -> EmbeddingResult:
        """
        Generate embedding for a single piece of content.
        
        Args:
            content: Text content to embed
            model: Model identifier (uses default from config)
            content_type: Type of content (text, code, etc.)
            use_cache: Whether to use caching
            
        Returns:
            EmbeddingResult with embedding and metadata
        """
        start_time = time.time()
        self._stats["total_requests"] += 1
        
        try:
            # Create content hash for caching
            content_hash = self._hash_content(content)
            
            # Check cache first if enabled
            if use_cache:
                cached_embedding = await self.cache_manager.get_embedding(content_hash)
                if cached_embedding is not None:
                    self._stats["cache_hits"] += 1
                    generation_time = time.time() - start_time
                    
                    return EmbeddingResult(
                        embedding=cached_embedding,
                        model_used=model,
                        cache_hit=True,
                        generation_time=generation_time,
                        token_count=len(content.split()),
                        content_hash=content_hash
                    )
            
            # Generate new embedding using Gemini
            self._stats["cache_misses"] += 1
            embedding = await self._generate_gemini_embedding(content, content_type)
            
            # Cache the result if caching is enabled
            if use_cache and embedding:
                await self.cache_manager.store_embedding(content_hash, embedding)
            
            generation_time = time.time() - start_time
            self._stats["total_generation_time"] += generation_time
            
            return EmbeddingResult(
                embedding=embedding,
                model_used=self.config.gemini_embedding_model,
                cache_hit=False,
                generation_time=generation_time,
                token_count=len(content.split()),
                content_hash=content_hash
            )
            
        except Exception as e:
            self._stats["errors"] += 1
            logger.error(f"Failed to generate embedding: {str(e)}")
            
            # Return empty embedding on error
            return EmbeddingResult(
                embedding=[],
                model_used=model,
                cache_hit=False,
                generation_time=time.time() - start_time,
                token_count=len(content.split()),
                content_hash=self._hash_content(content)
            )
    
    async def generate_batch_embeddings(
        self,
        contents: List[str],
        model: str = "default",
        content_types: Optional[List[str]] = None,
        use_cache: bool = True,
        batch_size: Optional[int] = None
    ) -> BatchEmbeddingResult:
        """
        Generate embeddings for multiple pieces of content efficiently.
        
        Args:
            contents: List of text contents to embed
            model: Model identifier
            content_types: List of content types (defaults to "text" for all)
            use_cache: Whether to use caching
            batch_size: Override default batch size
            
        Returns:
            BatchEmbeddingResult with all embeddings and statistics
        """
        start_time = time.time()
        
        if not contents:
            return BatchEmbeddingResult(
                embeddings=[],
                successful_items=0,
                failed_items=0,
                total_time=0.0,
                cache_hits=0,
                cache_misses=0,
                errors=[]
            )
        
        # Prepare content types
        if content_types is None:
            content_types = ["text"] * len(contents)
        elif len(content_types) != len(contents):
            content_types = content_types + ["text"] * (len(contents) - len(content_types))
        
        # Use configured batch size if not specified
        effective_batch_size = batch_size or self.config.max_batch_size
        
        embeddings = []
        errors = []
        cache_hits = 0
        cache_misses = 0
        
        # Process in batches
        for i in range(0, len(contents), effective_batch_size):
            batch_contents = contents[i:i + effective_batch_size]
            batch_types = content_types[i:i + effective_batch_size]
            
            # Process batch concurrently
            batch_tasks = [
                self.generate_embedding(content, model, content_type, use_cache)
                for content, content_type in zip(batch_contents, batch_types)
            ]
            
            try:
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        errors.append(str(result))
                        # Add empty result for failed item
                        embeddings.append(EmbeddingResult(
                            embedding=[],
                            model_used=model,
                            cache_hit=False,
                            generation_time=0.0,
                            token_count=0,
                            content_hash=""
                        ))
                    else:
                        embeddings.append(result)
                        if result.cache_hit:
                            cache_hits += 1
                        else:
                            cache_misses += 1
                            
            except Exception as e:
                error_msg = f"Batch processing failed: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                
                # Add empty results for failed batch
                for _ in batch_contents:
                    embeddings.append(EmbeddingResult(
                        embedding=[],
                        model_used=model,
                        cache_hit=False,
                        generation_time=0.0,
                        token_count=0,
                        content_hash=""
                    ))
        
        successful_items = len([e for e in embeddings if e.embedding])
        failed_items = len(embeddings) - successful_items
        total_time = time.time() - start_time
        
        return BatchEmbeddingResult(
            embeddings=embeddings,
            successful_items=successful_items,
            failed_items=failed_items,
            total_time=total_time,
            cache_hits=cache_hits,
            cache_misses=cache_misses,
            errors=errors
        )
    
    async def _generate_gemini_embedding(self, content: str, content_type: str = "text") -> List[float]:
        """Generate embedding using Gemini's embedding model (Gemini-only, no fallbacks)."""
        for attempt in range(self.config.embedding_retry_attempts):
            try:
                # Use configured Gemini embedding model with correct API
                response = gemini_client.embed_content(
                    model=self.config.gemini_embedding_model,
                    content=content,
                    task_type="retrieval_document"
                )
                
                if response and hasattr(response, 'embedding') and response.embedding:
                    logger.debug(f"Successfully generated embedding with {len(response.embedding)} dimensions")
                    return response.embedding
                else:
                    logger.warning("Gemini embedding response was empty or invalid")
                    
            except Exception as e:
                logger.warning(f"Gemini embedding attempt {attempt + 1} failed: {str(e)}")
                if attempt < self.config.embedding_retry_attempts - 1:
                    # Add delay between retries
                    await asyncio.sleep(self.config.gemini_request_delay_ms / 1000.0)
                else:
                    logger.error(f"All {self.config.embedding_retry_attempts} embedding attempts failed: {str(e)}")
        
        # Return empty embedding if all attempts failed
        return []
    
    def _hash_content(self, content: str) -> str:
        """Create a hash of content for caching."""
        import hashlib
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    async def compute_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float],
        method: str = "cosine"
    ) -> float:
        """
        Compute similarity between two embeddings.
        
        Args:
            embedding1: First embedding
            embedding2: Second embedding
            method: Similarity method ("cosine", "dot", "euclidean")
            
        Returns:
            Similarity score
        """
        try:
            if not embedding1 or not embedding2:
                return 0.0
            
            if len(embedding1) != len(embedding2):
                logger.warning("Embeddings have different dimensions")
                return 0.0
            
            if method == "cosine":
                return self._cosine_similarity(embedding1, embedding2)
            elif method == "dot":
                return self._dot_product(embedding1, embedding2)
            elif method == "euclidean":
                return self._euclidean_distance(embedding1, embedding2)
            else:
                logger.warning(f"Unknown similarity method: {method}, using cosine")
                return self._cosine_similarity(embedding1, embedding2)
                
        except Exception as e:
            logger.error(f"Similarity computation failed: {str(e)}")
            return 0.0
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Compute cosine similarity between two vectors."""
        try:
            import numpy as np
            
            a_np = np.array(a)
            b_np = np.array(b)
            
            dot_product = np.dot(a_np, b_np)
            norm_a = np.linalg.norm(a_np)
            norm_b = np.linalg.norm(b_np)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
            
            return float(dot_product / (norm_a * norm_b))
            
        except Exception as e:
            logger.error(f"Cosine similarity computation failed: {str(e)}")
            return 0.0
    
    def _dot_product(self, a: List[float], b: List[float]) -> float:
        """Compute dot product between two vectors."""
        try:
            return float(sum(x * y for x, y in zip(a, b)))
        except Exception as e:
            logger.error(f"Dot product computation failed: {str(e)}")
            return 0.0
    
    def _euclidean_distance(self, a: List[float], b: List[float]) -> float:
        """Compute euclidean distance between two vectors (returns 1/distance for similarity)."""
        try:
            import math
            
            distance = math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))
            # Convert distance to similarity (closer = higher similarity)
            return 1.0 / (1.0 + distance)
            
        except Exception as e:
            logger.error(f"Euclidean distance computation failed: {str(e)}")
            return 0.0
    
    async def find_similar_content(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[Tuple[str, List[float]]],
        top_k: int = 5,
        similarity_threshold: float = 0.1
    ) -> List[Tuple[str, float]]:
        """
        Find most similar content to a query embedding.
        
        Args:
            query_embedding: Query embedding to compare against
            candidate_embeddings: List of (content_id, embedding) tuples
            top_k: Number of top results to return
            similarity_threshold: Minimum similarity score to include
            
        Returns:
            List of (content_id, similarity_score) tuples, sorted by similarity
        """
        try:
            similarities = []
            
            for content_id, embedding in candidate_embeddings:
                similarity = await self.compute_similarity(query_embedding, embedding)
                
                if similarity >= similarity_threshold:
                    similarities.append((content_id, similarity))
            
            # Sort by similarity (highest first) and return top_k
            similarities.sort(key=lambda x: x[1], reverse=True)
            return similarities[:top_k]
            
        except Exception as e:
            logger.error(f"Similar content search failed: {str(e)}")
            return []
    
    async def warm_cache(self, contents: List[str]) -> int:
        """
        Warm the embedding cache with provided contents.
        
        Args:
            contents: List of contents to generate embeddings for
            
        Returns:
            Number of embeddings successfully cached
        """
        try:
            batch_result = await self.generate_batch_embeddings(
                contents=contents,
                use_cache=True
            )
            
            successful_embeddings = [e for e in batch_result.embeddings if e.embedding]
            
            logger.info(f"Cache warming completed: {len(successful_embeddings)} embeddings cached")
            return len(successful_embeddings)
            
        except Exception as e:
            logger.error(f"Cache warming failed: {str(e)}")
            return 0
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get embedding service statistics."""
        cache_stats = self.cache_manager.get_cache_stats()
        
        total_requests = self._stats["total_requests"]
        cache_hit_rate = (self._stats["cache_hits"] / total_requests) if total_requests > 0 else 0
        avg_generation_time = (self._stats["total_generation_time"] / self._stats["cache_misses"]) if self._stats["cache_misses"] > 0 else 0
        
        return {
            "service_stats": self._stats.copy(),
            "cache_hit_rate": cache_hit_rate,
            "average_generation_time": avg_generation_time,
            "cache_stats": cache_stats,
            "configuration": {
                "embedding_model": self.config.gemini_embedding_model,
                "max_batch_size": self.config.max_batch_size,
                "cache_enabled": True
            }
        }
    
    def reset_stats(self) -> None:
        """Reset service statistics."""
        self._stats = {
            "total_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "total_generation_time": 0.0,
            "errors": 0
        }

# Global service instance
_embedding_service: Optional[EmbeddingService] = None

def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service

def reset_embedding_service() -> None:
    """Reset the global service instance (useful for testing)."""
    global _embedding_service
    _embedding_service = None
