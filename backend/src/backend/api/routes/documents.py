"""Document analysis endpoints."""
import logging
from datetime import datetime
from typing import Union

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from ...schema.document_analysis import (
    AnalyzeDocumentRequest,
    AnalyzeDocumentResponse,
    AnalyzeDocumentErrorResponse,
    ProcessingStatusResponse
)
from ...core.services import get_document_processing_service

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents")

@router.post(
    "/analyze",
    response_model=Union[AnalyzeDocumentResponse, AnalyzeDocumentErrorResponse],
    responses={
        200: {"description": "Document analysis completed successfully"},
        202: {"description": "Document analysis started (async processing)"},
        400: {"description": "Invalid request parameters"},
        404: {"description": "Document not found"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    },
    summary="Analyze document and generate tags",
    description="""
    Analyze a document using AI to generate semantic tags with confidence scores.
    
    This endpoint:
    - Validates the document path for security (prevents directory traversal)
    - Checks file existence and supported formats (.txt, .md, .pdf, .docx)
    - Uses CrewAI with Google Gemini 2.0 to analyze document content
    - Returns meaningful tags with confidence scores and categories
    - Optionally generates document summaries
    
    The analysis considers technical concepts, processes, issues, and solutions
    to create tags useful for document organization and retrieval.
    """
)
async def analyze_document(request: AnalyzeDocumentRequest) -> Union[AnalyzeDocumentResponse, AnalyzeDocumentErrorResponse]:
    """
    Analyze a document and extract relevant tags using AI.
    
    This endpoint receives a document path and triggers CrewAI analysis for intelligent tagging.
    It validates the path for security, checks file existence, and processes the document
    using specialized AI agents to generate meaningful tags with confidence scores.
    
    Args:
        request: The document analysis request containing the document path and options.
    
    Returns:
        AnalyzeDocumentResponse: Successful analysis with tags and metadata
        AnalyzeDocumentErrorResponse: Error details if analysis fails
    
    Raises:
        HTTPException: For various error conditions with appropriate status codes
    """
    request_id = None
    
    try:
        logger.info(f"Starting document analysis for path: {request.document_path}")
        
        # Get the document analysis service
        analysis_service = get_document_processing_service()
        
        # Perform the analysis
        result = await analysis_service.analyze_document(
            document_path=request.document_path,
            max_tags=request.max_tags,
            generate_summary=request.generate_summary
        )
        
        logger.info(f"Document analysis completed successfully for {request.document_path} (request_id: {result.request_id})")
        
        return result
        
    except ValidationError as e:
        error_msg = f"Validation error: {str(e)}"
        logger.error(error_msg)
        
        error_response = AnalyzeDocumentErrorResponse(
            request_id=request_id or "unknown",
            error="validation_error",
            message="Invalid request parameters",
            details=str(e)
        )
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_response.dict()
        )
        
    except FileNotFoundError as e:
        error_msg = f"Document not found: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"The specified document could not be found: {str(e)}"
        )
        
    except ValueError as e:
        error_msg = f"Invalid request: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request parameters or file path: {str(e)}"
        )
        
    except PermissionError as e:
        error_msg = f"Permission denied: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to the specified document: {str(e)}"
        )
        
    except Exception as e:
        error_msg = f"Internal server error during document analysis: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during document analysis: {str(e)}"
        )

@router.get(
    "/analyze/{request_id}/status",
    response_model=ProcessingStatusResponse,
    summary="Get analysis status",
    description="Get the current status of a document analysis request"
)
async def get_analysis_status(request_id: str) -> ProcessingStatusResponse:
    """
    Get the status of a document analysis request.
    
    This endpoint allows checking the status of long-running analysis operations.
    Currently returns a simple status, but can be extended for async processing.
    
    Args:
        request_id: The unique identifier for the analysis request
        
    Returns:
        ProcessingStatusResponse: Current status of the analysis
    """
    try:
        # For now, return a simple completed status
        # In a production system, you would check actual job status from a queue/database
        return ProcessingStatusResponse(
            request_id=request_id,
            status="completed",
            message="Analysis has been completed",
            progress=1.0
        )
        
    except Exception as e:
        logger.error(f"Error retrieving status for request {request_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve analysis status: {str(e)}"
        )

@router.get(
    "/health",
    summary="Health check",
    description="Check if the document analysis service is healthy"
)
async def health_check():
    """
    Health check endpoint for the document analysis service.
    
    Returns:
        dict: Service health status
    """
    try:
        # Try to get the service instance to verify it's working
        service = get_document_processing_service()
        
        return {
            "status": "healthy",
            "service": "document_analysis",
            "message": "Document analysis service is running normally"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Document analysis service is not healthy: {str(e)}"
        )


@router.get(
    "/circuit-breakers",
    summary="Circuit breaker status",
    description="Get status of all circuit breakers"
)
async def get_circuit_breaker_status():
    """
    Get the status of all circuit breakers.
    
    Returns:
        dict: Circuit breaker states and statistics
    """
    try:
        from ...core.error_handling.circuit_breaker import get_circuit_breaker_manager
        
        circuit_manager = get_circuit_breaker_manager()
        states = circuit_manager.get_all_states()
        
        return {
            "circuit_breakers": states,
            "total_breakers": len(states),
            "healthy_breakers": len([s for s in states.values() if s["state"] == "closed"]),
            "open_breakers": len([s for s in states.values() if s["state"] == "open"]),
            "half_open_breakers": len([s for s in states.values() if s["state"] == "half_open"])
        }
        
    except Exception as e:
        logger.error(f"Failed to get circuit breaker status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get circuit breaker status: {str(e)}"
        )


@router.post(
    "/circuit-breakers/reset",
    summary="Reset circuit breakers",
    description="Reset all circuit breakers to closed state"
)
async def reset_circuit_breakers():
    """
    Reset all circuit breakers to closed state.
    
    Returns:
        dict: Reset confirmation
    """
    try:
        from ...core.error_handling.circuit_breaker import get_circuit_breaker_manager
        
        circuit_manager = get_circuit_breaker_manager()
        await circuit_manager.reset_all()
        
        return {
            "message": "All circuit breakers reset successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to reset circuit breakers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset circuit breakers: {str(e)}"
        )
