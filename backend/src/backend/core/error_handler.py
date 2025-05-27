"""Error handling and manual intervention system for document analysis."""
import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
from pathlib import Path

from ..exceptions.analysis_exceptions import (
    DocumentAnalysisError,
    ToolInitializationError,
    FileAccessError,
    UnsupportedFileTypeError,
    LLMAPIError,
    ProcessingTimeoutError,
    BatchProcessingError,
    TagExtractionError,
    ConfigurationError,
    FallbackExhaustionError
)

logger = logging.getLogger(__name__)

class InterventionPriority(Enum):
    """Priority levels for manual intervention tasks."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class InterventionStatus(Enum):
    """Status of manual intervention tasks."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

@dataclass
class FailureReport:
    """Detailed failure report for analysis operations."""
    error_id: str
    error_type: str
    error_code: str
    message: str
    file_path: Optional[str]
    details: Dict[str, Any]
    timestamp: datetime
    stack_trace: Optional[str]
    attempted_tools: List[str]
    fallback_exhausted: bool
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert failure report to dictionary."""
        return {
            "error_id": self.error_id,
            "error_type": self.error_type,
            "error_code": self.error_code,
            "message": self.message,
            "file_path": self.file_path,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
            "stack_trace": self.stack_trace,
            "attempted_tools": self.attempted_tools,
            "fallback_exhausted": self.fallback_exhausted
        }

@dataclass
class InterventionTask:
    """Manual intervention task details."""
    task_id: str
    failure_report: FailureReport
    priority: InterventionPriority
    status: InterventionStatus
    created_at: datetime
    assigned_to: Optional[str]
    notes: List[str]
    resolution_steps: List[str]
    estimated_effort: Optional[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert intervention task to dictionary."""
        return {
            "task_id": self.task_id,
            "failure_report": self.failure_report.to_dict(),
            "priority": self.priority.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "assigned_to": self.assigned_to,
            "notes": self.notes,
            "resolution_steps": self.resolution_steps,
            "estimated_effort": self.estimated_effort
        }

class AnalysisFailureHandler:
    """Handles analysis failures and creates manual intervention tasks."""
    
    def __init__(self):
        """Initialize the failure handler."""
        self.intervention_tasks: Dict[str, InterventionTask] = {}
        self.failure_reports: Dict[str, FailureReport] = {}
        self._error_patterns: Dict[str, Dict[str, Any]] = {}
        self._initialize_error_patterns()
    
    def _initialize_error_patterns(self) -> None:
        """Initialize known error patterns and their handling strategies."""
        self._error_patterns = {
            "TOOL_INIT_ERROR": {
                "priority": InterventionPriority.HIGH,
                "auto_retry": False,
                "escalation_threshold": 1,
                "resolution_steps": [
                    "Check tool dependencies and installation",
                    "Verify API keys and credentials",
                    "Review tool configuration parameters",
                    "Test with minimal example file"
                ]
            },
            "FILE_ACCESS_ERROR": {
                "priority": InterventionPriority.MEDIUM,
                "auto_retry": True,
                "escalation_threshold": 3,
                "resolution_steps": [
                    "Verify file exists and is readable",
                    "Check file permissions",
                    "Validate file path format",
                    "Test with different file location"
                ]
            },
            "UNSUPPORTED_FILE_TYPE": {
                "priority": InterventionPriority.LOW,
                "auto_retry": False,
                "escalation_threshold": 1,
                "resolution_steps": [
                    "Confirm file extension is supported",
                    "Check if file conversion is possible",
                    "Update supported file types if needed",
                    "Document limitation for user reference"
                ]
            },
            "LLM_API_ERROR": {
                "priority": InterventionPriority.HIGH,
                "auto_retry": True,
                "escalation_threshold": 2,
                "resolution_steps": [
                    "Check API key validity and quotas",
                    "Verify network connectivity",
                    "Review rate limiting policies",
                    "Consider alternative LLM providers"
                ]
            },
            "PROCESSING_TIMEOUT": {
                "priority": InterventionPriority.MEDIUM,
                "auto_retry": True,
                "escalation_threshold": 2,
                "resolution_steps": [
                    "Check file size and complexity",
                    "Increase timeout parameters",
                    "Consider file preprocessing",
                    "Optimize processing pipeline"
                ]
            },
            "FALLBACK_EXHAUSTION": {
                "priority": InterventionPriority.CRITICAL,
                "auto_retry": False,
                "escalation_threshold": 1,
                "resolution_steps": [
                    "Review all attempted tools and errors",
                    "Check if new tools are available",
                    "Consider manual processing approach",
                    "Escalate to development team"
                ]
            }
        }
    
    async def handle_failure(
        self, 
        error: Exception, 
        file_path: Optional[str] = None,
        attempted_tools: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> FailureReport:
        """Handle an analysis failure and create appropriate reports."""
        import traceback
        import uuid
        
        # Generate unique error ID
        error_id = str(uuid.uuid4())
        
        # Extract error information
        if isinstance(error, DocumentAnalysisError):
            error_type = error.__class__.__name__
            error_code = error.error_code
            message = error.message
            details = error.details
            file_path = file_path or error.file_path
        else:
            error_type = error.__class__.__name__
            error_code = "UNKNOWN_ERROR"
            message = str(error)
            details = {"original_error": str(error)}
        
        # Create failure report
        failure_report = FailureReport(
            error_id=error_id,
            error_type=error_type,
            error_code=error_code,
            message=message,
            file_path=file_path,
            details=details,
            timestamp=datetime.utcnow(),
            stack_trace=traceback.format_exc(),
            attempted_tools=attempted_tools or [],
            fallback_exhausted=isinstance(error, FallbackExhaustionError)
        )
        
        # Store failure report
        self.failure_reports[error_id] = failure_report
        
        # Log the failure
        logger.error(
            f"Analysis failure [{error_id}]: {error_code} - {message}",
            extra={
                "error_id": error_id,
                "file_path": file_path,
                "error_code": error_code,
                "attempted_tools": attempted_tools
            }
        )
        
        # Create manual intervention task if needed
        if self._should_create_intervention_task(error_code, failure_report):
            intervention_task = await self.create_manual_intervention_task(failure_report)
            logger.warning(f"Created manual intervention task: {intervention_task.task_id}")
        
        return failure_report
    
    def _should_create_intervention_task(self, error_code: str, failure_report: FailureReport) -> bool:
        """Determine if a manual intervention task should be created."""
        pattern = self._error_patterns.get(error_code, {})
        
        # Always create task for critical errors
        if pattern.get("priority") == InterventionPriority.CRITICAL:
            return True
        
        # Check if this error type has occurred recently
        recent_failures = self._get_recent_failures_by_type(error_code, hours=24)
        escalation_threshold = pattern.get("escalation_threshold", 1)
        
        return len(recent_failures) >= escalation_threshold
    
    def _get_recent_failures_by_type(self, error_code: str, hours: int = 24) -> List[FailureReport]:
        """Get recent failures of a specific type."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return [
            report for report in self.failure_reports.values()
            if report.error_code == error_code and report.timestamp >= cutoff_time
        ]
    
    async def create_manual_intervention_task(self, failure_report: FailureReport) -> InterventionTask:
        """Create a manual intervention task for a failure."""
        import uuid
        
        task_id = str(uuid.uuid4())
        pattern = self._error_patterns.get(failure_report.error_code, {})
        
        intervention_task = InterventionTask(
            task_id=task_id,
            failure_report=failure_report,
            priority=pattern.get("priority", InterventionPriority.MEDIUM),
            status=InterventionStatus.PENDING,
            created_at=datetime.utcnow(),
            assigned_to=None,
            notes=[],
            resolution_steps=pattern.get("resolution_steps", []),
            estimated_effort=self._estimate_effort(failure_report.error_code)
        )
        
        self.intervention_tasks[task_id] = intervention_task
        
        # Log intervention task creation
        logger.info(
            f"Created intervention task [{task_id}] for error [{failure_report.error_id}]",
            extra={
                "task_id": task_id,
                "error_id": failure_report.error_id,
                "priority": intervention_task.priority.value,
                "error_code": failure_report.error_code
            }
        )
        
        return intervention_task
    
    def _estimate_effort(self, error_code: str) -> str:
        """Estimate effort required to resolve an error type."""
        effort_map = {
            "TOOL_INIT_ERROR": "30-60 minutes",
            "FILE_ACCESS_ERROR": "15-30 minutes",
            "UNSUPPORTED_FILE_TYPE": "5-15 minutes",
            "LLM_API_ERROR": "15-45 minutes",
            "PROCESSING_TIMEOUT": "20-40 minutes",
            "FALLBACK_EXHAUSTION": "60-120 minutes",
            "CONFIGURATION_ERROR": "10-30 minutes"
        }
        return effort_map.get(error_code, "30-60 minutes")
    
    def get_pending_interventions(self) -> List[InterventionTask]:
        """Get all pending manual intervention tasks."""
        return [
            task for task in self.intervention_tasks.values()
            if task.status == InterventionStatus.PENDING
        ]
    
    def get_intervention_by_id(self, task_id: str) -> Optional[InterventionTask]:
        """Get intervention task by ID."""
        return self.intervention_tasks.get(task_id)
    
    def update_intervention_status(
        self, 
        task_id: str, 
        status: InterventionStatus,
        notes: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> bool:
        """Update intervention task status."""
        task = self.intervention_tasks.get(task_id)
        if not task:
            return False
        
        task.status = status
        if notes:
            task.notes.append(f"[{datetime.utcnow().isoformat()}] {notes}")
        if assigned_to:
            task.assigned_to = assigned_to
        
        logger.info(f"Updated intervention task [{task_id}] status to {status.value}")
        return True
    
    def get_failure_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get failure statistics for the specified time period."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_failures = [
            report for report in self.failure_reports.values()
            if report.timestamp >= cutoff_time
        ]
        
        # Count by error code
        error_counts = {}
        for report in recent_failures:
            error_counts[report.error_code] = error_counts.get(report.error_code, 0) + 1
        
        # Count by file type
        file_type_counts = {}
        for report in recent_failures:
            if report.file_path:
                ext = Path(report.file_path).suffix.lower()
                file_type_counts[ext] = file_type_counts.get(ext, 0) + 1
        
        return {
            "total_failures": len(recent_failures),
            "error_counts": error_counts,
            "file_type_counts": file_type_counts,
            "pending_interventions": len(self.get_pending_interventions()),
            "time_period_hours": hours
        }
    
    async def cleanup_old_records(self, days: int = 30) -> Tuple[int, int]:
        """Clean up old failure reports and resolved intervention tasks."""
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        # Clean up old failure reports
        old_failures = [
            error_id for error_id, report in self.failure_reports.items()
            if report.timestamp < cutoff_time
        ]
        for error_id in old_failures:
            del self.failure_reports[error_id]
        
        # Clean up resolved intervention tasks
        old_tasks = [
            task_id for task_id, task in self.intervention_tasks.items()
            if task.status in [InterventionStatus.RESOLVED, InterventionStatus.DISMISSED]
            and task.created_at < cutoff_time
        ]
        for task_id in old_tasks:
            del self.intervention_tasks[task_id]
        
        logger.info(f"Cleaned up {len(old_failures)} old failure reports and {len(old_tasks)} old intervention tasks")
        return len(old_failures), len(old_tasks)

# Global error handler instance
_error_handler: Optional[AnalysisFailureHandler] = None

def get_error_handler() -> AnalysisFailureHandler:
    """Get or create the global error handler instance."""
    global _error_handler
    if _error_handler is None:
        _error_handler = AnalysisFailureHandler()
    return _error_handler

def reset_error_handler() -> None:
    """Reset the global error handler instance (useful for testing)."""
    global _error_handler
    _error_handler = None
