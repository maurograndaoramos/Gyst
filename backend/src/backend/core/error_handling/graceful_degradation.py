"""Comprehensive error handling service that integrates all fallback mechanisms."""
import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import uuid
import traceback

from ..error_handling.circuit_breaker import get_circuit_breaker_manager, CircuitBreakerError
from ..error_handling.error_handler import get_error_handler
from ..error_handling.error_intervention_manager import get_error_intervention_manager
from ...exceptions.analysis_exceptions import ProcessingTimeoutError, DocumentAnalysisError
from ...schema.document_analysis import AnalyzeDocumentResponse, TagModel, AnalyzeDocumentErrorResponse

logger = logging.getLogger(__name__)

class GracefulDegradationService:
    """Service that provides graceful degradation for AI processing failures."""
    
    def __init__(self):
        """Initialize the graceful degradation service."""
        self.circuit_manager = get_circuit_breaker_manager()
        self.error_handler = get_error_handler()
        self.intervention_manager = get_error_intervention_manager()
        
        # Manual tagging queue for failures
        self.manual_queue: Dict[str, Dict[str, Any]] = {}
        
        # Partial results storage
        self.partial_results: Dict[str, Dict[str, Any]] = {}
    
    async def process_with_fallback(
        self,
        processing_func,
        document_path: str,
        max_tags: int = 10,
        generate_summary: bool = False,
        timeout_seconds: int = 120
    ) -> Union[AnalyzeDocumentResponse, AnalyzeDocumentErrorResponse]:
        """
        Process document with comprehensive fallback mechanisms.
        
        Args:
            processing_func: The primary processing function to execute
            document_path: Path to the document
            max_tags: Maximum number of tags to generate
            generate_summary: Whether to generate summary
            timeout_seconds: Processing timeout in seconds
            
        Returns:
            Either successful response or error response with partial results
        """
        request_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        try:
            # Execute with timeout
            result = await asyncio.wait_for(
                processing_func(
                    document_path=document_path,
                    max_tags=max_tags,
                    generate_summary=generate_summary
                ),
                timeout=timeout_seconds
            )
            
            return result
            
        except asyncio.TimeoutError:
            # Handle timeout - return partial results if available
            return await self._handle_timeout(
                request_id=request_id,
                document_path=document_path,
                max_tags=max_tags,
                timeout_seconds=timeout_seconds,
                start_time=start_time
            )
            
        except CircuitBreakerError:
            # Circuit breaker is open - add to manual queue
            return await self._handle_circuit_breaker_open(
                request_id=request_id,
                document_path=document_path,
                max_tags=max_tags,
                start_time=start_time
            )
            
        except Exception as e:
            # General error handling with manual intervention
            return await self._handle_general_error(
                request_id=request_id,
                document_path=document_path,
                error=e,
                max_tags=max_tags,
                start_time=start_time
            )
    
    async def _handle_timeout(
        self,
        request_id: str,
        document_path: str,
        max_tags: int,
        timeout_seconds: int,
        start_time: datetime
    ) -> AnalyzeDocumentErrorResponse:
        """Handle processing timeout with partial results."""
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Check for partial results
        partial_tags = self._get_partial_results(request_id, document_path)
        
        # Create timeout error
        timeout_error = ProcessingTimeoutError(
            file_path=document_path,
            timeout_seconds=timeout_seconds,
            details={
                "partial_tags_count": len(partial_tags) if partial_tags else 0,
                "processing_time": processing_time
            }
        )
        
        # Log timeout with context
        logger.error(
            f"Processing timeout after {timeout_seconds}s for {document_path}",
            extra={
                "request_id": request_id,
                "document_path": document_path,
                "timeout_seconds": timeout_seconds,
                "partial_results_available": bool(partial_tags)
            }
        )
        
        # Add to manual queue
        await self._add_to_manual_queue(
            request_id=request_id,
            document_path=document_path,
            error_type="timeout",
            error_details={
                "timeout_seconds": timeout_seconds,
                "partial_results": partial_tags
            }
        )
        
        # Handle failure through error system
        await self.error_handler.handle_failure(
            error=timeout_error,
            file_path=document_path,
            context={
                "request_id": request_id,
                "timeout_seconds": timeout_seconds,
                "partial_results": partial_tags
            }
        )
        
        return AnalyzeDocumentErrorResponse(
            request_id=request_id,
            error="processing_timeout",
            message=f"Document processing timed out after {timeout_seconds} seconds",
            details={
                "timeout_seconds": timeout_seconds,
                "partial_results_available": bool(partial_tags),
                "manual_queue_id": request_id
            },
            created_at=datetime.utcnow()
        )
    
    async def _handle_circuit_breaker_open(
        self,
        request_id: str,
        document_path: str,
        max_tags: int,
        start_time: datetime
    ) -> AnalyzeDocumentErrorResponse:
        """Handle circuit breaker open state."""
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.warning(
            f"Circuit breaker open for document analysis: {document_path}",
            extra={
                "request_id": request_id,
                "document_path": document_path,
                "circuit_breaker_state": "open"
            }
        )
        
        # Add to manual queue for later processing
        await self._add_to_manual_queue(
            request_id=request_id,
            document_path=document_path,
            error_type="circuit_breaker_open",
            error_details={
                "message": "AI service temporarily unavailable",
                "suggested_retry_minutes": 5
            }
        )
        
        return AnalyzeDocumentErrorResponse(
            request_id=request_id,
            error="service_unavailable",
            message="AI analysis service is temporarily unavailable due to repeated failures",
            details={
                "circuit_breaker_state": "open",
                "manual_queue_id": request_id,
                "retry_after_minutes": 5
            },
            created_at=datetime.utcnow()
        )
    
    async def _handle_general_error(
        self,
        request_id: str,
        document_path: str,
        error: Exception,
        max_tags: int,
        start_time: datetime
    ) -> AnalyzeDocumentErrorResponse:
        """Handle general processing errors."""
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Log error with full context
        logger.error(
            f"Document analysis failed for {document_path}: {str(error)}",
            extra={
                "request_id": request_id,
                "document_path": document_path,
                "error_type": type(error).__name__,
                "processing_time": processing_time,
                "stack_trace": traceback.format_exc()
            }
        )
        
        # Handle through error system
        failure_report = await self.error_handler.handle_failure(
            error=error,
            file_path=document_path,
            context={
                "request_id": request_id,
                "max_tags": max_tags,
                "processing_time": processing_time
            }
        )
        
        # Create intervention task if needed
        await self.intervention_manager.handle_analysis_failure(
            request_id=request_id,
            error=error,
            document_path=document_path,
            context={
                "max_tags": max_tags,
                "processing_time": processing_time,
                "failure_report_id": failure_report.error_id
            }
        )
        
        # Add to manual queue
        await self._add_to_manual_queue(
            request_id=request_id,
            document_path=document_path,
            error_type=type(error).__name__,
            error_details={
                "error_message": str(error),
                "failure_report_id": failure_report.error_id
            }
        )
        
        return AnalyzeDocumentErrorResponse(
            request_id=request_id,
            error="analysis_failed",
            message="Document analysis failed and has been queued for manual review",
            details={
                "error_type": type(error).__name__,
                "manual_queue_id": request_id,
                "failure_report_id": failure_report.error_id
            },
            created_at=datetime.utcnow()
        )
    
    def _get_partial_results(self, request_id: str, document_path: str) -> List[TagModel]:
        """Get partial results if available."""
        # Check if we have any saved partial results
        partial_key = f"{request_id}_{document_path}"
        if partial_key in self.partial_results:
            return self.partial_results[partial_key].get("tags", [])
        
        # Return basic fallback tags
        return [
            TagModel(
                name="processing-interrupted",
                confidence=0.5,
                category="system",
                description="Document processing was interrupted and requires manual review"
            ),
            TagModel(
                name="partial-analysis",
                confidence=0.4,
                category="system", 
                description="Incomplete analysis due to processing timeout"
            )
        ]
    
    async def _add_to_manual_queue(
        self,
        request_id: str,
        document_path: str,
        error_type: str,
        error_details: Dict[str, Any]
    ) -> None:
        """Add failed request to manual processing queue."""
        queue_entry = {
            "request_id": request_id,
            "document_path": document_path,
            "error_type": error_type,
            "error_details": error_details,
            "created_at": datetime.utcnow().isoformat(),
            "status": "pending_manual_review",
            "priority": self._calculate_queue_priority(error_type),
            "retry_count": 0
        }
        
        self.manual_queue[request_id] = queue_entry
        
        logger.info(
            f"Added document to manual queue: {document_path}",
            extra={
                "request_id": request_id,
                "error_type": error_type,
                "queue_priority": queue_entry["priority"]
            }
        )
    
    def _calculate_queue_priority(self, error_type: str) -> str:
        """Calculate priority for manual queue based on error type."""
        priority_map = {
            "timeout": "medium",
            "circuit_breaker_open": "low",
            "ProcessingTimeoutError": "medium",
            "LLMAPIError": "high",
            "ToolInitializationError": "high",
            "ConfigurationError": "critical",
            "FallbackExhaustionError": "critical"
        }
        return priority_map.get(error_type, "medium")
    
    def get_manual_queue_status(self) -> Dict[str, Any]:
        """Get status of manual processing queue."""
        queue_by_priority = {}
        for entry in self.manual_queue.values():
            priority = entry["priority"]
            if priority not in queue_by_priority:
                queue_by_priority[priority] = []
            queue_by_priority[priority].append(entry)
        
        return {
            "total_items": len(self.manual_queue),
            "by_priority": {
                priority: len(items) for priority, items in queue_by_priority.items()
            },
            "oldest_item": min(
                (entry["created_at"] for entry in self.manual_queue.values()),
                default=None
            )
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status of error handling system."""
        circuit_breakers = self.circuit_manager.get_all_states()
        manual_queue_status = self.get_manual_queue_status()
        
        # Calculate overall health
        open_breakers = sum(1 for state in circuit_breakers.values() if state["state"] == "open")
        total_breakers = len(circuit_breakers)
        
        health_score = 1.0
        if total_breakers > 0:
            health_score = 1.0 - (open_breakers / total_breakers)
        
        # Adjust for queue size
        if manual_queue_status["total_items"] > 10:
            health_score *= 0.8
        elif manual_queue_status["total_items"] > 5:
            health_score *= 0.9
        
        overall_status = "healthy"
        if health_score < 0.5:
            overall_status = "critical"
        elif health_score < 0.7:
            overall_status = "degraded"
        elif health_score < 0.9:
            overall_status = "warning"
        
        return {
            "overall_status": overall_status,
            "health_score": health_score,
            "circuit_breakers": circuit_breakers,
            "manual_queue": manual_queue_status,
            "error_handling": {
                "intervention_tasks_pending": len(self.error_handler.get_pending_interventions()),
                "recent_failures_24h": len(self.error_handler._get_recent_failures_by_type("", 24))
            }
        }

# Global service instance
_graceful_degradation_service: Optional[GracefulDegradationService] = None

def get_graceful_degradation_service() -> GracefulDegradationService:
    """Get or create the global graceful degradation service."""
    global _graceful_degradation_service
    if _graceful_degradation_service is None:
        _graceful_degradation_service = GracefulDegradationService()
    return _graceful_degradation_service

def reset_graceful_degradation_service() -> None:
    """Reset the global service (useful for testing)."""
    global _graceful_degradation_service
    _graceful_degradation_service = None
