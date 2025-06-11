"""Document Processing Service - Orchestrates document processing pipeline for Enhanced RAG."""
import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

from ..processing.chunking import get_smart_chunker, get_chunk_optimizer, get_content_extractor
from ..processing.chunking.smart_chunker import ChunkingStrategy
from ..processing.document_tool_factory import get_document_tool_factory
from ..config.rag_config import get_rag_config
from .embedding_service import get_embedding_service

logger = logging.getLogger(__name__)

@dataclass
class DocumentProcessingResult:
    """Result of document processing operation."""
    document_path: str
    success: bool
    chunks: List[Any]
    metadata: Dict[str, Any]
    extraction_quality: float
    processing_time: float
    chunk_count: int
    embeddings_generated: int
    errors: List[str]

@dataclass
class BatchProcessingResult:
    """Result of batch document processing."""
    results: List[DocumentProcessingResult]
    total_documents: int
    successful_documents: int
    failed_documents: int
    total_chunks: int
    total_embeddings: int
    processing_time: float
    average_quality: float
    errors: List[str]

class DocumentProcessingService:
    """Service for orchestrating complete document processing pipeline."""
    
    def __init__(self):
        self.config = get_rag_config()
        self.document_factory = get_document_tool_factory()
        self.chunker = get_smart_chunker()
        self.optimizer = get_chunk_optimizer()
        self.content_extractor = get_content_extractor()
        self.embedding_service = get_embedding_service()
        self._thread_executor = ThreadPoolExecutor(max_workers=4)
        
        # Processing statistics
        self._stats = {
            "total_documents_processed": 0,
            "successful_documents": 0,
            "failed_documents": 0,
            "total_chunks_created": 0,
            "total_embeddings_generated": 0,
            "total_processing_time": 0.0,
            "average_quality_score": 0.0
        }
        
        logger.info("Document Processing Service initialized successfully")
    
    async def process_single_document(
        self,
        document_path: str,
        chunking_strategy: ChunkingStrategy = ChunkingStrategy.ADAPTIVE,
        generate_embeddings: bool = True,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> DocumentProcessingResult:
        """
        Process a single document through the complete pipeline.
        
        Args:
            document_path: Path to the document file
            chunking_strategy: Strategy for document chunking
            generate_embeddings: Whether to generate embeddings for chunks
            custom_config: Custom configuration overrides
            
        Returns:
            DocumentProcessingResult with processing details
        """
        start_time = time.time()
        errors = []
        
        try:
            # Validate file access
            if not await self.document_factory.validate_file_access(document_path):
                error_msg = f"Cannot access file: {document_path}"
                logger.error(error_msg)
                return DocumentProcessingResult(
                    document_path=document_path,
                    success=False,
                    chunks=[],
                    metadata={},
                    extraction_quality=0.0,
                    processing_time=time.time() - start_time,
                    chunk_count=0,
                    embeddings_generated=0,
                    errors=[error_msg]
                )
            
            # Extract content
            extracted_content = await self._extract_content_async(document_path)
            
            # Check extraction quality
            if extracted_content.extraction_quality < 0.1:
                error_msg = f"Extraction quality too low for {document_path}: {extracted_content.extraction_quality}"
                logger.warning(error_msg)
                errors.append(error_msg)
                
                return DocumentProcessingResult(
                    document_path=document_path,
                    success=False,
                    chunks=[],
                    metadata=extracted_content.metadata,
                    extraction_quality=extracted_content.extraction_quality,
                    processing_time=time.time() - start_time,
                    chunk_count=0,
                    embeddings_generated=0,
                    errors=errors
                )
            
            # Smart chunking
            chunks = await self._chunk_document_async(
                content=extracted_content.cleaned_content,
                document_path=document_path,
                strategy=chunking_strategy,
                custom_config=custom_config
            )
            
            # Optimize chunks
            optimized_chunks, optimization_metrics = await self.optimizer.optimize_chunks(
                chunks, document_path
            )
            
            # Generate embeddings if requested
            embeddings_generated = 0
            if generate_embeddings:
                embeddings_generated = await self._generate_embeddings_for_chunks(
                    optimized_chunks, document_path
                )
            
            # Update statistics
            self._update_stats(
                success=True,
                chunks_created=len(optimized_chunks),
                embeddings_generated=embeddings_generated,
                processing_time=time.time() - start_time,
                quality_score=extracted_content.extraction_quality
            )
            
            logger.info(f"Successfully processed {document_path}: {len(optimized_chunks)} chunks")
            
            return DocumentProcessingResult(
                document_path=document_path,
                success=True,
                chunks=optimized_chunks,
                metadata={
                    **extracted_content.metadata.__dict__,
                    "optimization_metrics": optimization_metrics,
                    "chunking_strategy": chunking_strategy.value
                },
                extraction_quality=extracted_content.extraction_quality,
                processing_time=time.time() - start_time,
                chunk_count=len(optimized_chunks),
                embeddings_generated=embeddings_generated,
                errors=errors
            )
            
        except Exception as e:
            error_msg = f"Failed to process document {document_path}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
            
            # Update statistics for failure
            self._update_stats(
                success=False,
                processing_time=time.time() - start_time
            )
            
            return DocumentProcessingResult(
                document_path=document_path,
                success=False,
                chunks=[],
                metadata={},
                extraction_quality=0.0,
                processing_time=time.time() - start_time,
                chunk_count=0,
                embeddings_generated=0,
                errors=errors
            )
    
    async def process_document_batch(
        self,
        document_paths: List[str],
        chunking_strategy: ChunkingStrategy = ChunkingStrategy.ADAPTIVE,
        generate_embeddings: bool = True,
        max_concurrent: Optional[int] = None,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> BatchProcessingResult:
        """
        Process multiple documents concurrently.
        
        Args:
            document_paths: List of document paths to process
            chunking_strategy: Strategy for document chunking
            generate_embeddings: Whether to generate embeddings
            max_concurrent: Maximum concurrent processing (uses config default)
            custom_config: Custom configuration overrides
            
        Returns:
            BatchProcessingResult with aggregated results
        """
        start_time = time.time()
        
        if not document_paths:
            return BatchProcessingResult(
                results=[],
                total_documents=0,
                successful_documents=0,
                failed_documents=0,
                total_chunks=0,
                total_embeddings=0,
                processing_time=0.0,
                average_quality=0.0,
                errors=[]
            )
        
        # Determine concurrency limit
        max_concurrent = max_concurrent or self.config.max_concurrent_batches
        
        # Group documents by file extension for optimized processing
        processing_strategy = self.document_factory.get_processing_strategy(document_paths)
        
        results = []
        all_errors = []
        
        # Process documents in groups by file type
        for file_ext, doc_group in processing_strategy.items():
            # Get concurrent limit for this file type
            ext_limit = self.document_factory.get_concurrent_limit(file_ext)
            effective_limit = min(max_concurrent, ext_limit)
            
            logger.info(f"Processing {len(doc_group)} {file_ext} files with concurrency {effective_limit}")
            
            # Process this group in batches
            for i in range(0, len(doc_group), effective_limit):
                batch = doc_group[i:i + effective_limit]
                
                # Create tasks for concurrent processing
                tasks = [
                    self.process_single_document(
                        document_path=doc_path,
                        chunking_strategy=chunking_strategy,
                        generate_embeddings=generate_embeddings,
                        custom_config=custom_config
                    )
                    for doc_path in batch
                ]
                
                try:
                    # Execute batch concurrently
                    batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for result in batch_results:
                        if isinstance(result, Exception):
                            error_msg = f"Batch processing error: {str(result)}"
                            logger.error(error_msg)
                            all_errors.append(error_msg)
                        else:
                            results.append(result)
                            if result.errors:
                                all_errors.extend(result.errors)
                                
                except Exception as e:
                    error_msg = f"Batch execution failed: {str(e)}"
                    logger.error(error_msg)
                    all_errors.append(error_msg)
        
        # Aggregate results
        successful_documents = len([r for r in results if r.success])
        failed_documents = len(results) - successful_documents
        total_chunks = sum(r.chunk_count for r in results)
        total_embeddings = sum(r.embeddings_generated for r in results)
        
        # Calculate average quality (only for successful documents)
        successful_results = [r for r in results if r.success]
        average_quality = (
            sum(r.extraction_quality for r in successful_results) / len(successful_results)
            if successful_results else 0.0
        )
        
        total_time = time.time() - start_time
        
        logger.info(
            f"Batch processing completed: {successful_documents}/{len(document_paths)} successful, "
            f"{total_chunks} chunks, {total_embeddings} embeddings in {total_time:.2f}s"
        )
        
        return BatchProcessingResult(
            results=results,
            total_documents=len(document_paths),
            successful_documents=successful_documents,
            failed_documents=failed_documents,
            total_chunks=total_chunks,
            total_embeddings=total_embeddings,
            processing_time=total_time,
            average_quality=average_quality,
            errors=all_errors
        )
    
    async def reprocess_with_different_strategy(
        self,
        document_path: str,
        new_strategy: ChunkingStrategy,
        compare_with_existing: bool = True
    ) -> Dict[str, Any]:
        """
        Reprocess a document with a different chunking strategy and optionally compare results.
        
        Args:
            document_path: Path to the document
            new_strategy: New chunking strategy to use
            compare_with_existing: Whether to compare with previous results
            
        Returns:
            Comparison results and new processing data
        """
        try:
            # Process with new strategy
            new_result = await self.process_single_document(
                document_path=document_path,
                chunking_strategy=new_strategy,
                generate_embeddings=False  # Skip embeddings for comparison
            )
            
            comparison_data = {
                "document_path": document_path,
                "new_strategy": new_strategy.value,
                "new_result": {
                    "success": new_result.success,
                    "chunk_count": new_result.chunk_count,
                    "extraction_quality": new_result.extraction_quality,
                    "processing_time": new_result.processing_time,
                    "errors": new_result.errors
                }
            }
            
            if compare_with_existing and new_result.success:
                # Try to process with adaptive strategy for comparison
                adaptive_result = await self.process_single_document(
                    document_path=document_path,
                    chunking_strategy=ChunkingStrategy.ADAPTIVE,
                    generate_embeddings=False
                )
                
                comparison_data["adaptive_result"] = {
                    "chunk_count": adaptive_result.chunk_count,
                    "extraction_quality": adaptive_result.extraction_quality,
                    "processing_time": adaptive_result.processing_time
                }
                
                comparison_data["comparison"] = {
                    "chunk_count_diff": new_result.chunk_count - adaptive_result.chunk_count,
                    "quality_diff": new_result.extraction_quality - adaptive_result.extraction_quality,
                    "time_diff": new_result.processing_time - adaptive_result.processing_time,
                    "recommended_strategy": (
                        new_strategy.value 
                        if new_result.chunk_count > adaptive_result.chunk_count and 
                           new_result.extraction_quality >= adaptive_result.extraction_quality
                        else "adaptive"
                    )
                }
            
            return comparison_data
            
        except Exception as e:
            logger.error(f"Strategy comparison failed for {document_path}: {str(e)}")
            return {
                "document_path": document_path,
                "error": str(e),
                "new_strategy": new_strategy.value
            }
    
    async def _extract_content_async(self, document_path: str):
        """Extract content asynchronously using thread executor."""
        # Resolve the path to the correct location (frontend uploads)
        resolved_path = self.document_factory._resolve_file_path(document_path)
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._thread_executor,
            self.content_extractor.extract_content,
            str(resolved_path)
        )
    
    async def _chunk_document_async(
        self,
        content: str,
        document_path: str,
        strategy: ChunkingStrategy,
        custom_config: Optional[Dict[str, Any]] = None
    ):
        """Chunk document asynchronously using thread executor."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self._thread_executor,
            self.chunker.chunk_document,
            content,
            document_path,
            strategy,
            custom_config
        )
    
    async def _generate_embeddings_for_chunks(
        self,
        chunks: List[Any],
        document_path: str
    ) -> int:
        """Generate embeddings for document chunks."""
        try:
            if not chunks:
                return 0
            
            # Extract content from chunks
            chunk_contents = [chunk.content for chunk in chunks]
            chunk_types = [getattr(chunk, 'chunk_type', 'text') for chunk in chunks]
            
            # Generate embeddings in batch
            batch_result = await self.embedding_service.generate_batch_embeddings(
                contents=chunk_contents,
                content_types=chunk_types,
                use_cache=True
            )
            
            return batch_result.successful_items
            
        except Exception as e:
            logger.error(f"Failed to generate embeddings for {document_path}: {str(e)}")
            return 0
    
    def _update_stats(
        self,
        success: bool,
        chunks_created: int = 0,
        embeddings_generated: int = 0,
        processing_time: float = 0.0,
        quality_score: float = 0.0
    ) -> None:
        """Update processing statistics."""
        self._stats["total_documents_processed"] += 1
        
        if success:
            self._stats["successful_documents"] += 1
            self._stats["total_chunks_created"] += chunks_created
            self._stats["total_embeddings_generated"] += embeddings_generated
            
            # Update average quality score
            if quality_score > 0:
                current_avg = self._stats["average_quality_score"]
                successful_docs = self._stats["successful_documents"]
                self._stats["average_quality_score"] = (
                    (current_avg * (successful_docs - 1) + quality_score) / successful_docs
                )
        else:
            self._stats["failed_documents"] += 1
        
        self._stats["total_processing_time"] += processing_time
    
    def get_processing_summary(self) -> Dict[str, Any]:
        """Get comprehensive processing statistics and performance summary."""
        total_docs = self._stats["total_documents_processed"]
        avg_time_per_doc = (
            self._stats["total_processing_time"] / total_docs
            if total_docs > 0 else 0.0
        )
        
        success_rate = (
            self._stats["successful_documents"] / total_docs
            if total_docs > 0 else 0.0
        )
        
        avg_chunks_per_doc = (
            self._stats["total_chunks_created"] / self._stats["successful_documents"]
            if self._stats["successful_documents"] > 0 else 0.0
        )
        
        return {
            "processing_statistics": self._stats.copy(),
            "performance_metrics": {
                "success_rate": success_rate,
                "average_time_per_document": avg_time_per_doc,
                "average_chunks_per_document": avg_chunks_per_doc,
                "average_quality_score": self._stats["average_quality_score"]
            },
            "configuration": {
                "max_chunk_size": self.config.max_chunk_size,
                "chunk_overlap_ratio": self.config.chunk_overlap_ratio,
                "max_concurrent_batches": self.config.max_concurrent_batches,
                "supported_extensions": list(self.document_factory.get_supported_extensions())
            },
            "component_status": {
                "chunker": "healthy",
                "optimizer": "healthy",
                "content_extractor": "healthy",
                "embedding_service": "healthy",
                "document_factory": "healthy"
            }
        }
    
    def reset_statistics(self) -> None:
        """Reset processing statistics."""
        self._stats = {
            "total_documents_processed": 0,
            "successful_documents": 0,
            "failed_documents": 0,
            "total_chunks_created": 0,
            "total_embeddings_generated": 0,
            "total_processing_time": 0.0,
            "average_quality_score": 0.0
        }
        
        logger.info("Processing statistics reset")
    
    async def analyze_document(
        self,
        document_path: str,
        max_tags: int = 10,
        generate_summary: bool = False
    ):
        """
        Analyze a document and generate tags with confidence scores using CrewAI.
        
        This method bridges the API interface with the CrewAI analysis pipeline.
        It processes the document and returns the result in the expected API format.
        
        Args:
            document_path: Path to the document to analyze
            max_tags: Maximum number of tags to generate
            generate_summary: Whether to generate a document summary
            
        Returns:
            AnalyzeDocumentResponse: Analysis result with tags and metadata
        """
        try:
            # Import CrewAI service
            from .crewai_service import get_document_analysis_service
            
            # Get the CrewAI document analysis service
            crewai_service = get_document_analysis_service()
            
            # Use CrewAI to analyze the document
            analysis_result = await crewai_service.analyze_document(
                document_path=document_path,
                max_tags=max_tags,
                generate_summary=generate_summary
            )
            
            logger.info(f"CrewAI analysis completed for {document_path} with {len(analysis_result.tags)} tags")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Document analysis failed for {document_path}: {str(e)}")
            raise

    def __del__(self):
        """Cleanup thread executor on service destruction."""
        if hasattr(self, '_thread_executor'):
            self._thread_executor.shutdown(wait=False)

# Global service instance
_document_processing_service: Optional[DocumentProcessingService] = None

def get_document_processing_service() -> DocumentProcessingService:
    """Get or create the global document processing service instance."""
    global _document_processing_service
    if _document_processing_service is None:
        _document_processing_service = DocumentProcessingService()
    return _document_processing_service

def reset_document_processing_service() -> None:
    """Reset the global service instance (useful for testing)."""
    global _document_processing_service
    if _document_processing_service is not None:
        _document_processing_service._thread_executor.shutdown(wait=False)
    _document_processing_service = None
