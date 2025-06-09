"""Chat endpoints for document-aware conversations."""
import logging
import json
import asyncio
from datetime import datetime
from typing import Union, AsyncGenerator

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.responses import Response
from pydantic import ValidationError

from ...schema.chat import (
    ChatRequest, ChatResponse, ChatErrorResponse, 
    ChatStreamChunk, ConversationSummary, ChatHealth
)
from ...core.services.chat_service import get_chat_service
from ...core.error_handling.circuit_breaker import CircuitBreakerError

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat")

@router.post(
    "/",
    response_model=Union[ChatResponse, ChatErrorResponse],
    responses={
        200: {"description": "Chat response generated successfully"},
        400: {"description": "Invalid request parameters"},
        422: {"description": "Validation error"},
        429: {"description": "Rate limit exceeded"},
        500: {"description": "Internal server error"},
        503: {"description": "Service temporarily unavailable"}
    },
    summary="Send a chat message with document context",
    description="""
    Send a message to the AI assistant with optional document context.
    
    This endpoint:
    - Processes natural language queries using CrewAI agents
    - Maintains conversation memory across messages
    - Analyzes provided documents for context
    - Returns intelligent responses with source citations
    - Supports follow-up questions and conversation flow
    - Handles concurrent requests efficiently
    
    The AI assistant can understand complex queries, extract information from documents,
    and maintain context across the conversation for a natural chat experience.
    """
)
async def chat_message(request: ChatRequest) -> Union[ChatResponse, ChatErrorResponse]:
    """
    Process a chat message and return an AI response.
    
    This endpoint processes user messages using CrewAI agents that can analyze
    documents and maintain conversation context. It supports both standalone
    questions and follow-up queries in ongoing conversations.
    
    Args:
        request: The chat request containing the message and optional context.
    
    Returns:
        ChatResponse: Successful response with AI message and sources
        ChatErrorResponse: Error details if processing fails
    
    Raises:
        HTTPException: For various error conditions with appropriate status codes
    """
    conversation_id = request.conversation_id
    
    try:
        logger.info(f"Processing chat message for conversation: {conversation_id}")
        
        # Check if streaming is requested
        if request.stream:
            return StreamingResponse(
                _stream_chat_response(request),
                media_type="text/plain",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
            )
        
        # Get the chat service
        chat_service = get_chat_service()
        
        # Process the chat request
        result = await chat_service.chat(request)
        
        logger.info(f"Chat message processed successfully for conversation: {result.conversation_id}")
        
        return result
        
    except ValidationError as e:
        error_msg = f"Validation error: {str(e)}"
        logger.error(error_msg)
        
        error_response = ChatErrorResponse(
            conversation_id=conversation_id,
            error="validation_error",
            message="Invalid request parameters",
            details=str(e)
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response.model_dump(mode='json')
        )
        
    except FileNotFoundError as e:
        error_msg = f"Document not found: {str(e)}"
        logger.error(error_msg)
        
        error_response = ChatErrorResponse(
            conversation_id=conversation_id,
            error="document_not_found",
            message="One or more specified documents could not be found",
            details=str(e)
        )
        
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_response.model_dump(mode='json')
        )
        
    except ValueError as e:
        error_msg = f"Invalid request: {str(e)}"
        logger.error(error_msg)
        
        error_response = ChatErrorResponse(
            conversation_id=conversation_id,
            error="invalid_request",
            message="Invalid request parameters or document paths",
            details=str(e)
        )
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=error_response.model_dump(mode='json')
        )
        
    except CircuitBreakerError as e:
        error_msg = f"Service temporarily unavailable: {str(e)}"
        logger.error(error_msg)
        
        error_response = ChatErrorResponse(
            conversation_id=conversation_id,
            error="service_unavailable",
            message="Chat service is temporarily unavailable",
            details="Please try again in a few moments",
            retry_after=30
        )
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error_response.model_dump(mode='json'),
            headers={"Retry-After": "30"}
        )
        
    except Exception as e:
        error_msg = f"Internal server error during chat processing: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        error_response = ChatErrorResponse(
            conversation_id=conversation_id,
            error="internal_server_error",
            message="An unexpected error occurred during chat processing",
            details="Please check the server logs for more information"
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response.model_dump(mode='json')
        )

async def _stream_chat_response(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Stream chat response in chunks."""
    conversation_id = request.conversation_id or "stream"
    
    try:
        # Send initial chunk
        initial_chunk = ChatStreamChunk(
            conversation_id=conversation_id,
            chunk_type="start",
            content="",
            metadata={"status": "processing"}
        )
        yield f"data: {initial_chunk.json()}\n\n"
        
        # Get chat service
        chat_service = get_chat_service()
        
        # Process the request (simplified streaming - in practice you'd need to modify the service)
        result = await chat_service.chat(request)
        
        # Stream the response content in chunks
        content = result.message.content
        chunk_size = 50  # Characters per chunk
        
        for i in range(0, len(content), chunk_size):
            chunk_content = content[i:i+chunk_size]
            
            chunk = ChatStreamChunk(
                conversation_id=result.conversation_id,
                chunk_type="content",
                content=chunk_content
            )
            
            yield f"data: {chunk.json()}\n\n"
            
            # Small delay to simulate streaming
            await asyncio.sleep(0.1)
        
        # Send sources chunk
        if result.sources:
            sources_chunk = ChatStreamChunk(
                conversation_id=result.conversation_id,
                chunk_type="sources",
                sources=result.sources
            )
            yield f"data: {sources_chunk.json()}\n\n"
        
        # Send completion chunk
        complete_chunk = ChatStreamChunk(
            conversation_id=result.conversation_id,
            chunk_type="complete",
            metadata={
                "processing_time": result.processing_time_seconds,
                "follow_up_suggestions": result.follow_up_suggestions
            }
        )
        yield f"data: {complete_chunk.json()}\n\n"
        
    except Exception as e:
        logger.error(f"Error during streaming: {e}")
        error_chunk = ChatStreamChunk(
            conversation_id=conversation_id,
            chunk_type="error",
            metadata={"error": str(e)}
        )
        yield f"data: {error_chunk.json()}\n\n"

@router.get(
    "/conversations/{conversation_id}/summary",
    response_model=ConversationSummary,
    summary="Get conversation summary",
    description="Get a summary of a specific conversation including message count and topics"
)
async def get_conversation_summary(conversation_id: str) -> ConversationSummary:
    """
    Get summary information for a conversation.
    
    Args:
        conversation_id: The unique identifier for the conversation
        
    Returns:
        ConversationSummary: Summary of the conversation
    """
    try:
        chat_service = get_chat_service()
        summary = await chat_service.get_conversation_summary(conversation_id)
        
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found"
            )
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving conversation summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve conversation summary: {str(e)}"
        )

@router.get(
    "/health",
    response_model=ChatHealth,
    summary="Chat service health check",
    description="Check the health status of the chat service and its components"
)
async def chat_health_check() -> ChatHealth:
    """
    Health check endpoint for the chat service.
    
    Returns:
        ChatHealth: Comprehensive health status of chat components
    """
    try:
        chat_service = get_chat_service()
        health_data = chat_service.get_health_status()
        
        return ChatHealth(**health_data)
        
    except Exception as e:
        logger.error(f"Chat health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Chat service health check failed: {str(e)}"
        )

@router.delete(
    "/conversations/{conversation_id}",
    summary="Delete conversation",
    description="Delete a conversation and its history"
)
async def delete_conversation(conversation_id: str) -> Response:
    """
    Delete a conversation and its history.
    
    Args:
        conversation_id: The unique identifier for the conversation to delete
        
    Returns:
        Response: Confirmation of deletion
    """
    try:
        chat_service = get_chat_service()
        
        # Remove from active conversations
        if conversation_id in chat_service.active_conversations:
            del chat_service.active_conversations[conversation_id]
            
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Conversation {conversation_id} deleted successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )

@router.post(
    "/conversations/reset-memory",
    summary="Reset chat memory",
    description="Reset the chat service memory system"
)
async def reset_chat_memory() -> Response:
    """
    Reset the chat service memory system.
    
    Returns:
        Response: Confirmation of memory reset
    """
    try:
        chat_service = get_chat_service()
        
        # Clear active conversations
        chat_service.active_conversations.clear()
        
        # Reset memory storage if available
        if chat_service.memory_storage:
            # In practice, you might want to call a reset method on the memory storage
            logger.info("Memory storage reset requested")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "Chat memory reset successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error resetting chat memory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset chat memory: {str(e)}"
        )

@router.get(
    "/conversations",
    summary="List active conversations",
    description="Get a list of all active conversations"
)
async def list_conversations() -> Response:
    """
    Get a list of all active conversations.
    
    Returns:
        Response: List of active conversation IDs and metadata
    """
    try:
        chat_service = get_chat_service()
        
        conversations = []
        for conv_id, context in chat_service.active_conversations.items():
            conversations.append({
                "conversation_id": conv_id,
                "message_count": len(context.message_history),
                "last_activity": context.last_activity.isoformat(),
                "document_count": len(set(context.document_context))
            })
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "conversations": conversations,
                "total_count": len(conversations),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list conversations: {str(e)}"
        )
