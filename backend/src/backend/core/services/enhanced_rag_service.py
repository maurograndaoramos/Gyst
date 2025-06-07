"""Enhanced RAG Service - Main orchestration for the Enhanced RAG system."""
import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass

from ...gemini.client import client as gemini_client, GEMINI_MODEL
from ..processing.chunking import get_smart_chunker, get_chunk_optimizer, get_content_extractor
from ..processing.chunking.smart_chunker import ChunkingStrategy
from ..cache import get_embedding_cache_manager, get_embedding_batch_processor
from ..cache.embedding_batch_processor import BatchItem
from ..selection import get_tag_based_selector
from ..config.rag_config import get_rag_config
from ..processing.document_tool_factory import get_document_tool_factory

logger = logging.getLogger(__name__)

@dataclass
class RAGProcessingResult:
    """Result of Enhanced RAG processing."""
    processed_documents: Dict[str, Any]
    relevant_chunks: List[Any]
    embeddings_generated: int
    processing_time: float
    cache_hits: int
    quality_scores: Dict[str, float]
    errors: List[str]
    metadata: Dict[str, Any]

@dataclass
class DocumentProcessingMetrics:
    """Metrics for document processing performance."""
    total_documents: int
    successful_documents: int
    failed_documents: int
    total_chunks: int
    embedding_cache_hits: int
    embedding_cache_misses: int
    processing_time_seconds: float
    average_quality_score: float

class EnhancedRAGService:
    """Main service for orchestrating Enhanced RAG operations."""
    
    def __init__(self):
        self.config = get_rag_config()
        self.document_factory = get_document_tool_factory()
        self.chunker = get_smart_chunker()
        self.optimizer = get_chunk_optimizer()
        self.content_extractor = get_content_extractor()
        self.cache_manager = get_embedding_cache_manager()
        self.batch_processor = get_embedding_batch_processor()
        self.selector = get_tag_based_selector(enable_semantic_scoring=True)
        self._initialization_time = time.time()
        
        logger.info("Enhanced RAG Service initialized successfully")
    
    async def process_documents_for_rag(
        self,
        document_paths: List[str],
        query: Optional[str] = None,
        max_documents: Optional[int] = None,
        chunking_strategy: ChunkingStrategy = ChunkingStrategy.ADAPTIVE
    ) -> RAGProcessingResult:
        """
        Process documents through the complete Enhanced RAG pipeline.
        
        Args:
            document_paths: List of document file paths
            query: Optional query for semantic scoring
            max_documents: Maximum number of documents to process
            chunking_strategy: Strategy for document chunking
            
        Returns:
            RAGProcessingResult containing processed data and metrics
        """
        start_time = time.time()
        
        # Apply document limit
        max_docs = max_documents or self.config.max_documents_per_query
        limited_documents = document_paths[:max_docs]
        
        if len(document_paths) > max_docs:
            logger.warning(
                f"Document limit applied: processing {max_docs} of {len(document_paths)} documents"
            )
        
        processed_documents = {}
        all_chunks = []
        batch_items = []
        errors = []
        quality_scores = {}
        
        # Process each document
        for doc_path in limited_documents:
            try:
                # Validate file access
                if not await self.document_factory.validate_file_access(doc_path):
                    errors.append(f"Cannot access file: {doc_path}")
                    continue
                
                # Extract content
                extracted_content = self.content_extractor.extract_content(doc_path)
                
                # Check extraction quality
                if extracted_content.extraction_quality < 0.3:
                    logger.warning(f"Low extraction quality for {doc_path}: {extracted_content.extraction_quality}")
                    quality_scores[doc_path] = extracted_content.extraction_quality
                    if extracted_content.extraction_quality < 0.1:
                        errors.append(f"Extraction quality too low for {doc_path}")
                        continue
                
                # Smart chunking
                chunks = self.chunker.chunk_document(
                    content=extracted_content.cleaned_content,
                    document_path=doc_path,
                    strategy=chunking_strategy
                )
                
                # Optimize chunks
                optimized_chunks, metrics = await self.optimizer.optimize_chunks(chunks, doc_path)
                
                # Store processed document data
                processed_documents[doc_path] = {
                    "chunks": optimized_chunks,
                    "metadata": extracted_content.metadata,
                    "metrics": metrics,
                    "extraction_quality": extracted_content.extraction_quality,
                    "chunk_count": len(optimized_chunks)
                }
                
                quality_scores[doc_path] = extracted_content.extraction_quality
                all_chunks.extend(optimized_chunks)
                
                # Prepare batch items for embedding generation
                for chunk in optimized_chunks:
                    batch_items.append(BatchItem(
                        content=chunk.content,
                        model_name="default",
                        content_type=chunk.chunk_type,
                        chunk_index=chunk.chunk_index,
                        document_path=doc_path,
                        token_count=chunk.token_count
                    ))
                
                logger.info(f"Processed {doc_path}: {len(optimized_chunks)} chunks")
                
            except Exception as e:
                error_msg = f"Failed to process document {doc_path}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                continue
        
        # Generate embeddings for all chunks
        embeddings_generated = 0
        cache_hits = 0
        
        if batch_items:
            try:
                embedding_result = await self.batch_processor.process_batch_items(batch_items)
                embeddings_generated = embedding_result.successful_items
                cache_hits = getattr(embedding_result, 'cache_hits', 0)
                
                logger.info(f"Generated embeddings for {embeddings_generated} chunks")
                
            except Exception as e:
                error_msg = f"Failed to generate embeddings: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        # Select relevant chunks if query provided
        relevant_chunks = []
        if query and all_chunks:
            try:
                # Use enhanced document selection with semantic scoring
                relevant_docs = await self.selector.select_relevant_documents(
                    target_tags=[],  # Could be extracted from query
                    available_documents=list(processed_documents.keys()),
                    query_text=query,
                    document_chunks={doc: data["chunks"] for doc, data in processed_documents.items()},
                    context_metadata={"query": query}
                )
                
                # Extract chunks from relevant documents
                for doc_path in relevant_docs:
                    if doc_path in processed_documents:
                        relevant_chunks.extend(processed_documents[doc_path]["chunks"])
                
                logger.info(f"Selected {len(relevant_chunks)} relevant chunks for query")
                
            except Exception as e:
                error_msg = f"Failed to select relevant chunks: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        processing_time = time.time() - start_time
        
        return RAGProcessingResult(
            processed_documents=processed_documents,
            relevant_chunks=relevant_chunks,
            embeddings_generated=embeddings_generated,
            processing_time=processing_time,
            cache_hits=cache_hits,
            quality_scores=quality_scores,
            errors=errors,
            metadata={
                "total_documents_requested": len(document_paths),
                "documents_processed": len(processed_documents),
                "total_chunks": len(all_chunks),
                "chunking_strategy": chunking_strategy.value,
                "config_used": {
                    "max_chunk_size": self.config.max_chunk_size,
                    "chunk_overlap_ratio": self.config.chunk_overlap_ratio,
                    "enable_semantic_scoring": self.config.enable_semantic_scoring
                }
            }
        )
    
    async def get_document_analysis(
        self,
        document_paths: List[str],
        analysis_query: str,
        include_full_content: bool = False
    ) -> Dict[str, Any]:
        """
        Get detailed analysis of documents using Enhanced RAG.
        
        Args:
            document_paths: List of document paths to analyze
            analysis_query: Query describing what to analyze
            include_full_content: Whether to include full document content
            
        Returns:
            Analysis results with insights and recommendations
        """
        try:
            # Process documents through Enhanced RAG
            rag_result = await self.process_documents_for_rag(
                document_paths=document_paths,
                query=analysis_query,
                chunking_strategy=ChunkingStrategy.SEMANTIC
            )
            
            if rag_result.errors:
                logger.warning(f"Processing errors during analysis: {rag_result.errors}")
            
            # Prepare context for Gemini analysis
            context_chunks = rag_result.relevant_chunks[:10]  # Limit to top chunks
            context_text = "\n\n".join([
                f"Document: {chunk.document_path}\nContent: {chunk.content}"
                for chunk in context_chunks
            ])
            
            # Generate analysis using Gemini
            analysis_prompt = f"""
            Analyze the following documents based on this query: "{analysis_query}"
            
            Document Context:
            {context_text}
            
            Please provide:
            1. Key insights relevant to the query
            2. Important patterns or themes
            3. Specific recommendations
            4. Any limitations or gaps in the analysis
            
            Be specific and reference the document content where relevant.
            """
            
            # Call Gemini for analysis
            analysis_response = await self._call_gemini_for_analysis(analysis_prompt)
            
            return {
                "analysis": analysis_response,
                "query": analysis_query,
                "documents_analyzed": len(rag_result.processed_documents),
                "chunks_used": len(context_chunks),
                "processing_metrics": {
                    "processing_time": rag_result.processing_time,
                    "embeddings_generated": rag_result.embeddings_generated,
                    "cache_hits": rag_result.cache_hits,
                    "average_quality": sum(rag_result.quality_scores.values()) / len(rag_result.quality_scores) if rag_result.quality_scores else 0
                },
                "document_insights": {
                    doc_path: {
                        "chunk_count": data["chunk_count"],
                        "extraction_quality": data["extraction_quality"],
                        "has_relevant_content": doc_path in [chunk.document_path for chunk in context_chunks]
                    }
                    for doc_path, data in rag_result.processed_documents.items()
                },
                "errors": rag_result.errors
            }
            
        except Exception as e:
            logger.error(f"Document analysis failed: {str(e)}")
            return {
                "error": str(e),
                "analysis": "Analysis failed due to processing error.",
                "query": analysis_query,
                "documents_analyzed": 0
            }
    
    async def _call_gemini_for_analysis(self, prompt: str) -> str:
        """Call Gemini for document analysis."""
        try:
            model = gemini_client.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 2048,
                    "top_p": 0.8
                }
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini analysis call failed: {str(e)}")
            return f"Analysis unavailable due to error: {str(e)}"
    
    async def warm_cache_for_documents(self, document_paths: List[str]) -> Dict[str, Any]:
        """
        Warm the embedding cache for a set of documents.
        
        Args:
            document_paths: List of document paths to warm cache for
            
        Returns:
            Cache warming results and statistics
        """
        try:
            # Process a sample of each document for cache warming
            sample_items = []
            processed_docs = 0
            
            for doc_path in document_paths[:10]:  # Limit to 10 documents for warming
                try:
                    # Extract a sample of content
                    extracted_content = self.content_extractor.extract_content(doc_path)
                    
                    if extracted_content.extraction_quality > 0.3:
                        # Create a sample chunk
                        sample_content = extracted_content.cleaned_content[:1000]  # First 1000 chars
                        
                        sample_items.append(BatchItem(
                            content=sample_content,
                            model_name="default",
                            content_type="text",
                            document_path=doc_path
                        ))
                        processed_docs += 1
                        
                except Exception as e:
                    logger.warning(f"Could not sample {doc_path} for warming: {e}")
                    continue
            
            # Warm the cache
            warmed_count = 0
            if sample_items:
                warmed_count = await self.batch_processor.warm_up_cache(sample_items)
            
            return {
                "status": "success",
                "documents_sampled": processed_docs,
                "cache_items_warmed": warmed_count,
                "cache_stats": self.cache_manager.get_cache_stats()
            }
            
        except Exception as e:
            logger.error(f"Cache warming failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "documents_sampled": 0,
                "cache_items_warmed": 0
            }
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status and metrics."""
        try:
            cache_stats = self.cache_manager.get_cache_stats()
            batch_stats = self.batch_processor.get_processing_stats()
            optimizer_stats = self.optimizer.get_performance_summary()
            
            return {
                "system_status": "operational",
                "uptime_seconds": time.time() - self._initialization_time,
                "configuration": {
                    "max_chunk_size": self.config.max_chunk_size,
                    "chunk_overlap_ratio": self.config.chunk_overlap_ratio,
                    "max_documents_per_query": self.config.max_documents_per_query,
                    "embedding_model": self.config.gemini_embedding_model,
                    "semantic_scoring_enabled": self.config.enable_semantic_scoring
                },
                "cache_performance": cache_stats,
                "batch_processing": batch_stats,
                "chunk_optimization": optimizer_stats,
                "document_selector": {
                    "max_documents": self.selector.max_documents,
                    "semantic_scoring_enabled": self.selector.enable_semantic_scoring,
                    "scoring_weights": getattr(self.selector, 'scoring_weights', {})
                },
                "supported_extensions": list(self.document_factory.get_supported_extensions()),
                "component_health": {
                    "chunker": "healthy",
                    "optimizer": "healthy",
                    "cache_manager": "healthy",
                    "batch_processor": "healthy",
                    "selector": "healthy",
                    "document_factory": "healthy"
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get system status: {str(e)}")
            return {
                "system_status": "error",
                "error": str(e),
                "uptime_seconds": time.time() - self._initialization_time
            }
    
    def get_processing_metrics(self) -> DocumentProcessingMetrics:
        """Get aggregated processing metrics."""
        try:
            cache_stats = self.cache_manager.get_cache_stats()
            batch_stats = self.batch_processor.get_processing_stats()
            
            return DocumentProcessingMetrics(
                total_documents=getattr(batch_stats, 'total_documents_processed', 0),
                successful_documents=getattr(batch_stats, 'successful_documents', 0),
                failed_documents=getattr(batch_stats, 'failed_documents', 0),
                total_chunks=getattr(batch_stats, 'total_chunks_processed', 0),
                embedding_cache_hits=cache_stats.get('hits', 0),
                embedding_cache_misses=cache_stats.get('misses', 0),
                processing_time_seconds=getattr(batch_stats, 'total_processing_time', 0),
                average_quality_score=getattr(batch_stats, 'average_quality_score', 0.0)
            )
            
        except Exception as e:
            logger.error(f"Failed to get processing metrics: {str(e)}")
            return DocumentProcessingMetrics(
                total_documents=0,
                successful_documents=0,
                failed_documents=0,
                total_chunks=0,
                embedding_cache_hits=0,
                embedding_cache_misses=0,
                processing_time_seconds=0,
                average_quality_score=0.0
            )

# Global service instance
_enhanced_rag_service: Optional[EnhancedRAGService] = None

def get_enhanced_rag_service() -> EnhancedRAGService:
    """Get or create the global Enhanced RAG service instance."""
    global _enhanced_rag_service
    if _enhanced_rag_service is None:
        _enhanced_rag_service = EnhancedRAGService()
    return _enhanced_rag_service

def reset_enhanced_rag_service() -> None:
    """Reset the global service instance (useful for testing)."""
    global _enhanced_rag_service
    _enhanced_rag_service = None
