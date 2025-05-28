"""Custom exceptions for document analysis operations."""
from typing import Optional, Dict, Any
from datetime import datetime


class DocumentAnalysisError(Exception):
    """Base exception for document analysis operations."""
    
    def __init__(
        self, 
        message: str, 
        error_code: str = "ANALYSIS_ERROR",
        details: Optional[Dict[str, Any]] = None,
        file_path: Optional[str] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.file_path = file_path
        self.timestamp = datetime.utcnow()


class ToolInitializationError(DocumentAnalysisError):
    """Raised when a RAG tool fails to initialize."""
    
    def __init__(
        self, 
        tool_name: str, 
        message: str, 
        file_path: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"Failed to initialize {tool_name}: {message}",
            error_code="TOOL_INIT_ERROR",
            details=details,
            file_path=file_path
        )
        self.tool_name = tool_name


class FileAccessError(DocumentAnalysisError):
    """Raised when a file cannot be accessed or read."""
    
    def __init__(
        self, 
        file_path: str, 
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"File access error for {file_path}: {message}",
            error_code="FILE_ACCESS_ERROR",
            details=details,
            file_path=file_path
        )


class UnsupportedFileTypeError(DocumentAnalysisError):
    """Raised when an unsupported file type is encountered."""
    
    def __init__(
        self, 
        file_path: str, 
        file_extension: str,
        supported_extensions: Optional[list] = None
    ):
        supported = ", ".join(supported_extensions) if supported_extensions else "unknown"
        super().__init__(
            message=f"Unsupported file type '{file_extension}' for {file_path}. Supported: {supported}",
            error_code="UNSUPPORTED_FILE_TYPE",
            details={"extension": file_extension, "supported_extensions": supported_extensions},
            file_path=file_path
        )
        self.file_extension = file_extension
        self.supported_extensions = supported_extensions


class LLMAPIError(DocumentAnalysisError):
    """Raised when LLM API calls fail."""
    
    def __init__(
        self, 
        message: str, 
        api_provider: str = "unknown",
        status_code: Optional[int] = None,
        rate_limited: bool = False,
        quota_exceeded: bool = False,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"LLM API error ({api_provider}): {message}",
            error_code="LLM_API_ERROR",
            details=details
        )
        self.api_provider = api_provider
        self.status_code = status_code
        self.rate_limited = rate_limited
        self.quota_exceeded = quota_exceeded


class ProcessingTimeoutError(DocumentAnalysisError):
    """Raised when document processing times out."""
    
    def __init__(
        self, 
        file_path: str, 
        timeout_seconds: int,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"Processing timeout after {timeout_seconds}s for {file_path}",
            error_code="PROCESSING_TIMEOUT",
            details=details,
            file_path=file_path
        )
        self.timeout_seconds = timeout_seconds


class BatchProcessingError(DocumentAnalysisError):
    """Raised when batch processing fails."""
    
    def __init__(
        self, 
        message: str, 
        failed_files: Optional[list] = None,
        partial_results: Optional[Dict[str, Any]] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"Batch processing error: {message}",
            error_code="BATCH_PROCESSING_ERROR",
            details=details
        )
        self.failed_files = failed_files or []
        self.partial_results = partial_results or {}


class TagExtractionError(DocumentAnalysisError):
    """Raised when tag extraction from AI response fails."""
    
    def __init__(
        self, 
        message: str, 
        ai_response: Optional[str] = None,
        file_path: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"Tag extraction error: {message}",
            error_code="TAG_EXTRACTION_ERROR",
            details=details,
            file_path=file_path
        )
        self.ai_response = ai_response


class ConfigurationError(DocumentAnalysisError):
    """Raised when there's a configuration issue."""
    
    def __init__(
        self, 
        message: str, 
        config_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"Configuration error: {message}",
            error_code="CONFIGURATION_ERROR",
            details=details
        )
        self.config_key = config_key


class FallbackExhaustionError(DocumentAnalysisError):
    """Raised when all fallback tools have been exhausted."""
    
    def __init__(
        self, 
        file_path: str, 
        attempted_tools: list,
        last_error: Optional[Exception] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=f"All fallback tools exhausted for {file_path}. Attempted: {', '.join(attempted_tools)}",
            error_code="FALLBACK_EXHAUSTION",
            details=details,
            file_path=file_path
        )
        self.attempted_tools = attempted_tools
        self.last_error = last_error
