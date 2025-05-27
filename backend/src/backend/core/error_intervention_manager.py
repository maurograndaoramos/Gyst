"""Error Intervention Manager for handling analysis failures requiring manual intervention."""
import os
import json
import logging
import traceback
from typing import Dict, List, Any, Optional
from pathlib import Path
import uuid
from datetime import datetime, timedelta
from enum import Enum
import asyncio

from pydantic import BaseModel
from ..schema.document_analysis import AnalyzeDocumentErrorResponse
from .config import get_settings

logger = logging.getLogger(__name__)

class ErrorType(str, Enum):
    """Classification of error types for manual intervention."""
    TOOL_FAILURE = "tool_failure"
    LLM_API_ERROR = "llm_api_error"
    VALIDATION_ERROR = "validation_error"
    RESOURCE_ERROR = "resource_error"
    NETWORK_ERROR = "network_error"
    CONFIGURATION_ERROR = "configuration_error"
    UNKNOWN_ERROR = "unknown_error"

class InterventionPriority(str, Enum):
    """Priority levels for manual intervention tasks."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class InterventionStatus(str, Enum):
    """Status of manual intervention tasks."""
    PENDING_REVIEW = "pending_review"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    CANCELLED = "cancelled"

class ErrorReport(BaseModel):
    """Detailed error report for manual intervention."""
    request_id: str
    error_type: ErrorType
    error_message: str
    document_path: str
    stack_trace: str
    context: Dict[str, Any]
    timestamp: datetime
    requires_manual_intervention: bool = True
    retry_attempts: int = 0
    max_retries: int = 3

class InterventionTask(BaseModel):
    """Manual intervention task."""
    id: str
    request_id: str
    error_report: ErrorReport
    priority: InterventionPriority
    status: InterventionStatus
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolution_notes: Optional[str] = None
    resolution_time: Optional[datetime] = None
    escalation_count: int = 0

class ErrorInterventionManager:
    """Manages error handling and manual intervention workflows."""
    
    def __init__(self):
        """Initialize the error intervention manager."""
        self.settings = get_settings()
        
        # Create intervention data directory
        self.intervention_dir = Path(self.settings.upload_base_dir) / "interventions"
        self.intervention_dir.mkdir(exist_ok=True)
        
        # Active intervention tasks
        self.active_tasks: Dict[str, InterventionTask] = {}
        
        # Load existing tasks from disk
        self._load_existing_tasks()
        
        # Error classification patterns
        self._init_error_classification_patterns()
    
    def _init_error_classification_patterns(self):
        """Initialize patterns for automatic error classification."""
        self.error_patterns = {
            ErrorType.TOOL_FAILURE: [
                "PDFSearchTool",
                "DOCXSearchTool", 
                "TXTSearchTool",
                "corrupted",
                "malformed",
                "encoding error",
                "unsupported format"
            ],
            ErrorType.LLM_API_ERROR: [
                "gemini",
                "api key",
                "rate limit",
                "quota exceeded",
                "authentication",
                "503 Service Unavailable",
                "429 Too Many Requests"
            ],
            ErrorType.VALIDATION_ERROR: [
                "validation",
                "invalid path",
                "file not found",
                "permission denied",
                "directory traversal"
            ],
            ErrorType.RESOURCE_ERROR: [
                "memory",
                "disk space",
                "timeout",
                "resource exhausted",
                "out of memory"
            ],
            ErrorType.NETWORK_ERROR: [
                "connection",
                "network",
                "dns",
                "timeout",
                "unreachable"
            ],
            ErrorType.CONFIGURATION_ERROR: [
                "configuration",
                "environment variable",
                "missing key",
                "invalid config"
            ]
        }
    
    def classify_error(self, error: Exception) -> ErrorType:
        """Automatically classify error type based on error message and type."""
        error_message = str(error).lower()
        error_type_name = type(error).__name__.lower()
        
        # Check each error pattern
        for error_type, patterns in self.error_patterns.items():
            for pattern in patterns:
                if pattern.lower() in error_message or pattern.lower() in error_type_name:
                    return error_type
        
        # Default to unknown error
        return ErrorType.UNKNOWN_ERROR
    
    def calculate_priority(self, error_report: ErrorReport) -> InterventionPriority:
        """Calculate intervention priority based on error characteristics."""
        
        # Critical errors that affect system stability
        if error_report.error_type in [ErrorType.RESOURCE_ERROR, ErrorType.CONFIGURATION_ERROR]:
            return InterventionPriority.CRITICAL
        
        # High priority for API and tool failures
        if error_report.error_type in [ErrorType.LLM_API_ERROR, ErrorType.TOOL_FAILURE]:
            return InterventionPriority.HIGH
        
        # Medium priority for validation and network errors
        if error_report.error_type in [ErrorType.VALIDATION_ERROR, ErrorType.NETWORK_ERROR]:
            return InterventionPriority.MEDIUM
        
        # Low priority for unknown errors (might be transient)
        return InterventionPriority.LOW
    
    async def handle_analysis_failure(
        self,
        request_id: str,
        error: Exception,
        document_path: str,
        context: Dict[str, Any]
    ) -> InterventionTask:
        """
        Handle analysis failures with detailed error reporting and manual intervention workflow.
        
        Args:
            request_id: Unique identifier for the analysis request
            error: The exception that occurred
            document_path: Path to the document being analyzed
            context: Additional context information
            
        Returns:
            InterventionTask created for manual review
        """
        try:
            # Create detailed error report
            error_report = ErrorReport(
                request_id=request_id,
                error_type=self.classify_error(error),
                error_message=str(error),
                document_path=document_path,
                stack_trace=traceback.format_exc(),
                context=context,
                timestamp=datetime.utcnow(),
                requires_manual_intervention=True,
                retry_attempts=context.get("retry_attempts", 0),
                max_retries=3
            )
            
            # Calculate priority
            priority = self.calculate_priority(error_report)
            
            # Create intervention task
            task = InterventionTask(
                id=str(uuid.uuid4()),
                request_id=request_id,
                error_report=error_report,
                priority=priority,
                status=InterventionStatus.PENDING_REVIEW,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                escalation_count=0
            )
            
            # Store task
            await self._store_intervention_task(task)
            
            # Add to active tasks
            self.active_tasks[task.id] = task
            
            # Send notifications
            await self._notify_manual_intervention_required(task)
            
            logger.error(
                f"Manual intervention required for request {request_id}: {error_report.error_type.value} - {error_report.error_message}"
            )
            
            return task
            
        except Exception as handling_error:
            logger.error(f"Failed to handle analysis failure: {str(handling_error)}")
            # Create a minimal intervention task for the handling failure itself
            fallback_task = InterventionTask(
                id=str(uuid.uuid4()),
                request_id=request_id,
                error_report=ErrorReport(
                    request_id=request_id,
                    error_type=ErrorType.UNKNOWN_ERROR,
                    error_message=f"Error handling failure: {str(handling_error)}",
                    document_path=document_path,
                    stack_trace=traceback.format_exc(),
                    context=context,
                    timestamp=datetime.utcnow()
                ),
                priority=InterventionPriority.CRITICAL,
                status=InterventionStatus.PENDING_REVIEW,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            self.active_tasks[fallback_task.id] = fallback_task
            return fallback_task
    
    async def _store_intervention_task(self, task: InterventionTask) -> None:
        """Store intervention task to disk for persistence."""
        try:
            task_file = self.intervention_dir / f"{task.id}.json"
            
            # Convert to dict for JSON serialization
            task_dict = task.dict()
            
            # Convert datetime objects to ISO format
            for key, value in task_dict.items():
                if isinstance(value, datetime):
                    task_dict[key] = value.isoformat()
            
            # Handle nested datetime in error_report
            if "error_report" in task_dict and "timestamp" in task_dict["error_report"]:
                task_dict["error_report"]["timestamp"] = task_dict["error_report"]["timestamp"]
            
            # Write to file
            with open(task_file, 'w') as f:
                json.dump(task_dict, f, indent=2, default=str)
                
            logger.debug(f"Stored intervention task {task.id} to disk")
            
        except Exception as e:
            logger.error(f"Failed to store intervention task {task.id}: {str(e)}")
    
    def _load_existing_tasks(self) -> None:
        """Load existing intervention tasks from disk."""
        try:
            if not self.intervention_dir.exists():
                return
                
            for task_file in self.intervention_dir.glob("*.json"):
                try:
                    with open(task_file, 'r') as f:
                        task_dict = json.load(f)
                    
                    # Convert ISO datetime strings back to datetime objects
                    for key in ['created_at', 'updated_at', 'resolution_time']:
                        if task_dict.get(key):
                            task_dict[key] = datetime.fromisoformat(task_dict[key])
                    
                    if task_dict.get('error_report', {}).get('timestamp'):
                        task_dict['error_report']['timestamp'] = datetime.fromisoformat(
                            task_dict['error_report']['timestamp']
                        )
                    
                    # Create task object
                    task = InterventionTask(**task_dict)
                    
                    # Only load active tasks (not resolved/cancelled)
                    if task.status in [InterventionStatus.PENDING_REVIEW, InterventionStatus.IN_PROGRESS]:
                        self.active_tasks[task.id] = task
                        
                except Exception as e:
                    logger.error(f"Failed to load intervention task from {task_file}: {str(e)}")
                    continue
                    
            logger.info(f"Loaded {len(self.active_tasks)} active intervention tasks")
            
        except Exception as e:
            logger.error(f"Failed to load existing intervention tasks: {str(e)}")
    
    async def _notify_manual_intervention_required(self, task: InterventionTask) -> None:
        """Send notifications about manual intervention requirements."""
        try:
            # For now, just log the notification
            # In production, you would integrate with email, Slack, or other notification systems
            
            notification_message = f"""
MANUAL INTERVENTION REQUIRED

Task ID: {task.id}
Request ID: {task.request_id}
Priority: {task.priority.value.upper()}
Error Type: {task.error_report.error_type.value}
Document: {task.error_report.document_path}
Error: {task.error_report.error_message}

Created: {task.created_at.isoformat()}

Please review and resolve this issue in the intervention management system.
            """
            
            logger.warning(f"INTERVENTION REQUIRED: {notification_message}")
            
            # TODO: Implement actual notification sending
            # - Email notifications to administrators
            # - Slack/Discord webhook notifications
            # - Dashboard alerts
            # - SMS for critical issues
            
        except Exception as e:
            logger.error(f"Failed to send intervention notification: {str(e)}")
    
    def get_active_tasks(self, priority: Optional[InterventionPriority] = None) -> List[InterventionTask]:
        """Get list of active intervention tasks, optionally filtered by priority."""
        tasks = list(self.active_tasks.values())
        
        if priority:
            tasks = [task for task in tasks if task.priority == priority]
        
        # Sort by priority and creation time
        priority_order = {
            InterventionPriority.CRITICAL: 0,
            InterventionPriority.HIGH: 1,
            InterventionPriority.MEDIUM: 2,
            InterventionPriority.LOW: 3
        }
        
        tasks.sort(key=lambda t: (priority_order[t.priority], t.created_at))
        return tasks
    
    def get_task_by_id(self, task_id: str) -> Optional[InterventionTask]:
        """Get intervention task by ID."""
        return self.active_tasks.get(task_id)
    
    def get_task_by_request_id(self, request_id: str) -> Optional[InterventionTask]:
        """Get intervention task by original request ID."""
        for task in self.active_tasks.values():
            if task.request_id == request_id:
                return task
        return None
    
    async def update_task_status(
        self,
        task_id: str,
        status: InterventionStatus,
        assigned_to: Optional[str] = None,
        resolution_notes: Optional[str] = None
    ) -> bool:
        """Update intervention task status and metadata."""
        try:
            task = self.active_tasks.get(task_id)
            if not task:
                logger.error(f"Intervention task {task_id} not found")
                return False
            
            # Update task
            task.status = status
            task.updated_at = datetime.utcnow()
            
            if assigned_to:
                task.assigned_to = assigned_to
            
            if resolution_notes:
                task.resolution_notes = resolution_notes
            
            if status in [InterventionStatus.RESOLVED, InterventionStatus.CANCELLED]:
                task.resolution_time = datetime.utcnow()
                # Remove from active tasks
                del self.active_tasks[task_id]
            
            # Store updated task
            await self._store_intervention_task(task)
            
            logger.info(f"Updated intervention task {task_id} status to {status.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update intervention task {task_id}: {str(e)}")
            return False
    
    async def escalate_task(self, task_id: str, escalation_reason: str) -> bool:
        """Escalate an intervention task to higher priority."""
        try:
            task = self.active_tasks.get(task_id)
            if not task:
                return False
            
            # Increase escalation count
            task.escalation_count += 1
            task.updated_at = datetime.utcnow()
            task.status = InterventionStatus.ESCALATED
            
            # Increase priority if possible
            if task.priority == InterventionPriority.LOW:
                task.priority = InterventionPriority.MEDIUM
            elif task.priority == InterventionPriority.MEDIUM:
                task.priority = InterventionPriority.HIGH
            elif task.priority == InterventionPriority.HIGH:
                task.priority = InterventionPriority.CRITICAL
            
            # Add escalation to resolution notes
            escalation_note = f"\n[ESCALATION {task.escalation_count}] {datetime.utcnow().isoformat()}: {escalation_reason}"
            task.resolution_notes = (task.resolution_notes or "") + escalation_note
            
            # Store updated task
            await self._store_intervention_task(task)
            
            # Send escalation notification
            await self._notify_escalation(task, escalation_reason)
            
            logger.warning(f"Escalated intervention task {task_id} to {task.priority.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to escalate intervention task {task_id}: {str(e)}")
            return False
    
    async def _notify_escalation(self, task: InterventionTask, reason: str) -> None:
        """Send escalation notifications."""
        escalation_message = f"""
INTERVENTION TASK ESCALATED

Task ID: {task.id}
New Priority: {task.priority.value.upper()}
Escalation Count: {task.escalation_count}
Reason: {reason}

Original Error: {task.error_report.error_message}
Document: {task.error_report.document_path}

This task requires immediate attention.
        """
        
        logger.critical(f"ESCALATION: {escalation_message}")
    
    def get_intervention_statistics(self) -> Dict[str, Any]:
        """Get statistics about intervention tasks."""
        try:
            active_count = len(self.active_tasks)
            
            # Count by priority
            priority_counts = {}
            for priority in InterventionPriority:
                priority_counts[priority.value] = len([
                    task for task in self.active_tasks.values() 
                    if task.priority == priority
                ])
            
            # Count by error type
            error_type_counts = {}
            for error_type in ErrorType:
                error_type_counts[error_type.value] = len([
                    task for task in self.active_tasks.values()
                    if task.error_report.error_type == error_type
                ])
            
            # Average age of active tasks
            if active_count > 0:
                total_age = sum([
                    (datetime.utcnow() - task.created_at).total_seconds()
                    for task in self.active_tasks.values()
                ])
                avg_age_hours = (total_age / active_count) / 3600
            else:
                avg_age_hours = 0
            
            return {
                "active_tasks": active_count,
                "priority_distribution": priority_counts,
                "error_type_distribution": error_type_counts,
                "average_age_hours": round(avg_age_hours, 2),
                "oldest_task_age_hours": round(
                    max([
                        (datetime.utcnow() - task.created_at).total_seconds() / 3600
                        for task in self.active_tasks.values()
                    ], default=0), 2
                )
            }
            
        except Exception as e:
            logger.error(f"Failed to get intervention statistics: {str(e)}")
            return {"error": str(e)}

# Global manager instance
_error_intervention_manager: Optional[ErrorInterventionManager] = None

def get_error_intervention_manager() -> ErrorInterventionManager:
    """Get or create the global error intervention manager instance."""
    global _error_intervention_manager
    if _error_intervention_manager is None:
        _error_intervention_manager = ErrorInterventionManager()
    return _error_intervention_manager

def reset_manager() -> None:
    """Reset the global manager instance (useful for testing)."""
    global _error_intervention_manager
    _error_intervention_manager = None
