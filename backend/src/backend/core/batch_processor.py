"""Batch processing system for tag-relevant document analysis."""
import asyncio
import logging
from typing import Dict, List, Optional, Any, Set, Tuple
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import time

from ..schema.document_analysis import AnalyzeDocumentResponse, TagModel
from ..exceptions.analysis_exceptions import (
    BatchProcessingError,
    FileAccessError,
    ProcessingTimeoutError
)
from .document_tool_factory import get_document_tool_factory, DocumentToolFactory
from .error_handler import get_error_handler, AnalysisFailureHandler

logger = logging.getLogger(__name__)

@dataclass
class BatchConfiguration:
    """Configuration for batch processing operations."""
    max_concurrent_files: int = 5
    max_files_per_batch: int = 5
    processing_timeout_seconds: int = 300
    relevance_threshold: float = 0.6
    enable_parallel_processing: bool = True
    preserve_processing_order: bool = False

@dataclass
class DocumentRelevance:
    """Document relevance scoring for batch selection."""
    file_path: str
    relevance_score: float
    matching_tags: List[str]
    confidence_scores: List[float]
    last_analyzed: Optional[datetime]
    file_size_bytes: int

@dataclass
class BatchResult:
    """Result of a batch processing operation."""
    batch_id: str
    total_files: int
    successful_files: int
    failed_files: int
    processing_time_seconds: float
    results: List[AnalyzeDocumentResponse]
    errors: List[Dict[str, Any]]
    timestamp: datetime

class TagRelevantBatchProcessor:
    """Processes batches of documents based on tag relevance."""
    
    def __init__(
        self,
        config: Optional[BatchConfiguration] = None,
        tool_factory: Optional[DocumentToolFactory] = None,
        error_handler: Optional[AnalysisFailureHandler] = None
    ):
        """Initialize the batch processor."""
        self.config = config or BatchConfiguration()
        self.tool_factory = tool_factory or get_document_tool_factory()
        self.error_handler = error_handler or get_error_handler()
        self._active_batches: Dict[str, BatchResult] = {}
        self._document_cache: Dict[str, DocumentRelevance] = {}
        
    async def process_relevant_documents(
        self,
        target_tags: List[str],
        available_files: List[str],
        max_files: Optional[int] = None,
        relevance_threshold: Optional[float] = None
    ) -> BatchResult:
        """Process documents most relevant to the target tags."""
        import uuid
        
        batch_id = str(uuid.uuid4())
        start_time = time.time()
        max_files = max_files or self.config.max_files_per_batch
        relevance_threshold = relevance_threshold or self.config.relevance_threshold
        
        logger.info(f"Starting batch processing [{batch_id}] for tags: {target_tags}")
        
        try:
            # Step 1: Select most relevant documents
            relevant_docs = await self.select_most_relevant_files(
                available_files, target_tags, max_files, relevance_threshold
            )
            
            if not relevant_docs:
                logger.warning(f"No relevant documents found for tags: {target_tags}")
                return BatchResult(
                    batch_id=batch_id,
                    total_files=0,
                    successful_files=0,
                    failed_files=0,
                    processing_time_seconds=time.time() - start_time,
                    results=[],
                    errors=[],
                    timestamp=datetime.utcnow()
                )
            
            # Step 2: Validate file access
            valid_files = await self._validate_batch_files([doc.file_path for doc in relevant_docs])
            
            # Step 3: Process documents in optimized batches
            results, errors = await self._process_document_batch(
                valid_files, batch_id, target_tags
            )
            
            processing_time = time.time() - start_time
            
            batch_result = BatchResult(
                batch_id=batch_id,
                total_files=len(valid_files),
                successful_files=len(results),
                failed_files=len(errors),
                processing_time_seconds=processing_time,
                results=results,
                errors=errors,
                timestamp=datetime.utcnow()
            )
            
            self._active_batches[batch_id] = batch_result
            
            logger.info(
                f"Batch processing [{batch_id}] completed: "
                f"{len(results)} successful, {len(errors)} failed, "
                f"{processing_time:.2f}s total"
            )
            
            return batch_result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Batch processing [{batch_id}] failed: {str(e)}")
            
            # Handle batch-level failure
            failure_report = await self.error_handler.handle_failure(
                error=BatchProcessingError(
                    message=f"Batch processing failed: {str(e)}",
                    failed_files=available_files,
                    details={"target_tags": target_tags, "batch_id": batch_id}
                ),
                context={"batch_id": batch_id, "target_tags": target_tags}
            )
            
            return BatchResult(
                batch_id=batch_id,
                total_files=len(available_files),
                successful_files=0,
                failed_files=len(available_files),
                processing_time_seconds=processing_time,
                results=[],
                errors=[{
                    "error_id": failure_report.error_id,
                    "message": str(e),
                    "files": available_files
                }],
                timestamp=datetime.utcnow()
            )
    
    async def select_most_relevant_files(
        self,
        available_files: List[str],
        target_tags: List[str],
        max_files: int,
        relevance_threshold: float
    ) -> List[DocumentRelevance]:
        """Select the most relevant files based on tag matching."""
        relevant_docs = []
        
        for file_path in available_files:
            try:
                # Get or calculate relevance score
                relevance = await self._calculate_document_relevance(file_path, target_tags)
                
                if relevance.relevance_score >= relevance_threshold:
                    relevant_docs.append(relevance)
                    
            except Exception as e:
                logger.warning(f"Failed to calculate relevance for {file_path}: {str(e)}")
                continue
        
        # Sort by relevance score (highest first) and recency
        relevant_docs.sort(
            key=lambda x: (x.relevance_score, x.last_analyzed or datetime.min),
            reverse=True
        )
        
        # Return top N files
        selected = relevant_docs[:max_files]
        
        logger.info(
            f"Selected {len(selected)} files from {len(available_files)} available "
            f"(threshold: {relevance_threshold})"
        )
        
        return selected
    
    async def _calculate_document_relevance(
        self,
        file_path: str,
        target_tags: List[str]
    ) -> DocumentRelevance:
        """Calculate relevance score for a document based on target tags."""
        # Check cache first
        if file_path in self._document_cache:
            cached = self._document_cache[file_path]
            # Recalculate relevance with new target tags
            relevance_score = self._compute_tag_relevance(cached.matching_tags, target_tags)
            cached.relevance_score = relevance_score
            return cached
        
        # TODO: In a real implementation, this would query the database for existing tags
        # For now, we'll simulate document metadata
        file_info = Path(file_path)
        
        # Simulate existing tags (in real implementation, fetch from database)
        simulated_tags = self._simulate_document_tags(file_path)
        
        relevance_score = self._compute_tag_relevance(simulated_tags, target_tags)
        matching_tags = [tag for tag in simulated_tags if tag in target_tags]
        
        # Simulate confidence scores
        confidence_scores = [0.8, 0.7, 0.9][:len(matching_tags)]
        
        relevance = DocumentRelevance(
            file_path=file_path,
            relevance_score=relevance_score,
            matching_tags=matching_tags,
            confidence_scores=confidence_scores,
            last_analyzed=datetime.utcnow(),  # Simulate last analysis time
            file_size_bytes=file_info.stat().st_size if file_info.exists() else 0
        )
        
        # Cache the result
        self._document_cache[file_path] = relevance
        
        return relevance
    
    def _simulate_document_tags(self, file_path: str) -> List[str]:
        """Simulate document tags for demonstration purposes."""
        # In real implementation, this would fetch from database
        file_name = Path(file_path).name.lower()
        
        simulated_tags = []
        
        # Simple keyword-based simulation
        if "api" in file_name:
            simulated_tags.extend(["api", "integration", "technical"])
        if "error" in file_name or "bug" in file_name:
            simulated_tags.extend(["error", "troubleshooting", "bug-fix"])
        if "timeout" in file_name:
            simulated_tags.extend(["timeout", "performance", "network"])
        if "database" in file_name or "db" in file_name:
            simulated_tags.extend(["database", "sql", "data"])
        if "config" in file_name:
            simulated_tags.extend(["configuration", "setup", "deployment"])
        
        # Add some default tags
        if not simulated_tags:
            simulated_tags = ["general", "documentation"]
        
        return simulated_tags
    
    def _compute_tag_relevance(self, document_tags: List[str], target_tags: List[str]) -> float:
        """Compute relevance score based on tag matching."""
        if not document_tags or not target_tags:
            return 0.0
        
        # Simple Jaccard similarity
        doc_set = set(tag.lower() for tag in document_tags)
        target_set = set(tag.lower() for tag in target_tags)
        
        intersection = len(doc_set.intersection(target_set))
        union = len(doc_set.union(target_set))
        
        if union == 0:
            return 0.0
        
        return intersection / union
    
    async def _validate_batch_files(self, file_paths: List[str]) -> List[str]:
        """Validate that files can be accessed and processed."""
        valid_files = []
        
        validation_tasks = [
            self.tool_factory.validate_file_access(file_path)
            for file_path in file_paths
        ]
        
        results = await asyncio.gather(*validation_tasks, return_exceptions=True)
        
        for file_path, result in zip(file_paths, results):
            if isinstance(result, Exception):
                logger.error(f"File validation failed for {file_path}: {str(result)}")
            elif result:
                valid_files.append(file_path)
            else:
                logger.warning(f"File validation failed for {file_path}")
        
        return valid_files
    
    async def _process_document_batch(
        self,
        file_paths: List[str],
        batch_id: str,
        target_tags: List[str]
    ) -> Tuple[List[AnalyzeDocumentResponse], List[Dict[str, Any]]]:
        """Process a batch of documents with proper concurrency control."""
        results = []
        errors = []
        
        # Group files by extension for optimized processing
        processing_strategy = self.tool_factory.get_processing_strategy(file_paths)
        
        for extension, files in processing_strategy.items():
            concurrent_limit = min(
                self.tool_factory.get_concurrent_limit(extension),
                self.config.max_concurrent_files
            )
            
            logger.info(f"Processing {len(files)} {extension} files with limit {concurrent_limit}")
            
            # Process files in chunks based on concurrent limit
            for i in range(0, len(files), concurrent_limit):
                chunk = files[i:i + concurrent_limit]
                
                # Process chunk concurrently
                chunk_results, chunk_errors = await self._process_file_chunk(
                    chunk, batch_id, target_tags
                )
                
                results.extend(chunk_results)
                errors.extend(chunk_errors)
        
        return results, errors
    
    async def _process_file_chunk(
        self,
        file_paths: List[str],
        batch_id: str,
        target_tags: List[str]
    ) -> Tuple[List[AnalyzeDocumentResponse], List[Dict[str, Any]]]:
        """Process a chunk of files concurrently."""
        tasks = []
        
        for file_path in file_paths:
            task = asyncio.create_task(
                self._process_single_file(file_path, batch_id, target_tags)
            )
            tasks.append((file_path, task))
        
        results = []
        errors = []
        
        # Wait for all tasks with timeout
        try:
            completed_tasks = await asyncio.wait_for(
                asyncio.gather(*[task for _, task in tasks], return_exceptions=True),
                timeout=self.config.processing_timeout_seconds
            )
            
            for (file_path, _), result in zip(tasks, completed_tasks):
                if isinstance(result, Exception):
                    error_info = {
                        "file_path": file_path,
                        "error": str(result),
                        "batch_id": batch_id
                    }
                    errors.append(error_info)
                    
                    # Handle the error through error handler
                    await self.error_handler.handle_failure(
                        error=result,
                        file_path=file_path,
                        context={"batch_id": batch_id, "target_tags": target_tags}
                    )
                else:
                    results.append(result)
                    
        except asyncio.TimeoutError:
            logger.error(f"Batch processing timeout for chunk in batch {batch_id}")
            for file_path, task in tasks:
                if not task.done():
                    task.cancel()
                    error_info = {
                        "file_path": file_path,
                        "error": "Processing timeout",
                        "batch_id": batch_id
                    }
                    errors.append(error_info)
        
        return results, errors
    
    async def _process_single_file(
        self,
        file_path: str,
        batch_id: str,
        target_tags: List[str]
    ) -> AnalyzeDocumentResponse:
        """Process a single file with the appropriate tool."""
        try:
            # Create appropriate tool for file
            tool = await self.tool_factory.create_tool_async(file_path)
            
            # TODO: Integrate with actual CrewAI analysis
            # For now, simulate analysis result
            return await self._simulate_analysis_result(file_path, target_tags)
            
        except Exception as e:
            logger.error(f"Failed to process file {file_path} in batch {batch_id}: {str(e)}")
            raise
    
    async def _simulate_analysis_result(
        self,
        file_path: str,
        target_tags: List[str]
    ) -> AnalyzeDocumentResponse:
        """Simulate analysis result for demonstration purposes."""
        import uuid
        
        # Simulate processing delay
        await asyncio.sleep(0.1)
        
        # Generate simulated tags
        simulated_tags = [
            TagModel(
                name=tag,
                confidence=0.8,
                category="technical",
                description=f"Simulated tag for {tag}"
            )
            for tag in target_tags[:3]  # Return subset of target tags
        ]
        
        return AnalyzeDocumentResponse(
            request_id=str(uuid.uuid4()),
            document_path=file_path,
            status="completed",
            tags=simulated_tags,
            summary=f"Simulated analysis summary for {Path(file_path).name}",
            processing_time_seconds=0.1,
            created_at=datetime.utcnow()
        )
    
    def get_batch_status(self, batch_id: str) -> Optional[BatchResult]:
        """Get status of a batch processing operation."""
        return self._active_batches.get(batch_id)
    
    def get_active_batches(self) -> List[BatchResult]:
        """Get all active batch operations."""
        return list(self._active_batches.values())
    
    async def cleanup_completed_batches(self, max_age_hours: int = 24) -> int:
        """Clean up old completed batch records."""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        old_batches = [
            batch_id for batch_id, batch in self._active_batches.items()
            if batch.timestamp < cutoff_time
        ]
        
        for batch_id in old_batches:
            del self._active_batches[batch_id]
        
        logger.info(f"Cleaned up {len(old_batches)} old batch records")
        return len(old_batches)

# Global batch processor instance
_batch_processor: Optional[TagRelevantBatchProcessor] = None

def get_batch_processor() -> TagRelevantBatchProcessor:
    """Get or create the global batch processor instance."""
    global _batch_processor
    if _batch_processor is None:
        _batch_processor = TagRelevantBatchProcessor()
    return _batch_processor

def reset_batch_processor() -> None:
    """Reset the global batch processor instance (useful for testing)."""
    global _batch_processor
    _batch_processor = None
