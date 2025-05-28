"""Pydantic models for document analysis functionality."""
from typing import Optional, List
from pydantic import BaseModel, Field, validator
import uuid
from datetime import datetime
import os


class TagModel(BaseModel):
    """Model representing a single tag with metadata."""
    name: str = Field(..., description="The tag name", min_length=1, max_length=100)
    confidence: float = Field(..., description="AI confidence score for this tag", ge=0.0, le=1.0)
    category: Optional[str] = Field(None, description="Tag category (e.g., 'technical', 'process', 'issue')")
    description: Optional[str] = Field(None, description="Brief explanation of why this tag was assigned")


class AnalyzeDocumentRequest(BaseModel):
    """Request model for document analysis."""
    document_path: str = Field(
        ..., 
        description="Path to the document to analyze",
        min_length=1,
        max_length=500
    )
    generate_summary: Optional[bool] = Field(
        False, 
        description="Whether to generate a document summary along with tags"
    )
    max_tags: Optional[int] = Field(
        10, 
        description="Maximum number of tags to generate",
        ge=1,
        le=50
    )

    @validator('document_path')
    def validate_document_path(cls, v):
        """Validate document path for security and format."""
        if not v:
            raise ValueError("Document path cannot be empty")
        
        # Prevent directory traversal attacks
        if '..' in v or v.startswith('/') or '\\' in v:
            raise ValueError("Invalid document path: directory traversal not allowed")
        
        # Check for supported file extensions
        supported_extensions = {'.txt', '.md', '.pdf', '.docx'}
        file_ext = os.path.splitext(v)[1].lower()
        if file_ext not in supported_extensions:
            raise ValueError(f"Unsupported file format: {file_ext}. Supported formats: {', '.join(supported_extensions)}")
        
        return v


class AnalyzeDocumentResponse(BaseModel):
    """Response model for successful document analysis."""
    request_id: str = Field(..., description="Unique identifier for this analysis request")
    document_path: str = Field(..., description="Path of the analyzed document")
    status: str = Field(..., description="Analysis status")
    tags: List[TagModel] = Field(..., description="Generated tags with confidence scores")
    summary: Optional[str] = Field(None, description="Document summary if requested")
    processing_time_seconds: Optional[float] = Field(None, description="Time taken to process the document")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when analysis completed")


class AnalyzeDocumentErrorResponse(BaseModel):
    """Response model for analysis errors."""
    request_id: str = Field(..., description="Unique identifier for this analysis request")
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[str] = Field(None, description="Additional error details for debugging")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp when error occurred")


class ProcessingStatusResponse(BaseModel):
    """Response model for processing status checks."""
    request_id: str = Field(..., description="Unique identifier for this analysis request")
    status: str = Field(..., description="Current processing status")
    message: str = Field(..., description="Status description")
    progress: Optional[float] = Field(None, description="Processing progress (0.0 to 1.0)")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
