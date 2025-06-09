"""RAG API endpoints - Enhanced RAG system monitoring and management."""
import logging
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from ...core.services.enhanced_rag_service import get_enhanced_rag_service
from ...core.services.embedding_service import get_embedding_service
from ...core.services.document_processing_service import get_document_processing_service
from ...core.config.rag_config import get_rag_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["Enhanced RAG"])

# Request/Response Models
class CacheWarmupRequest(BaseModel):
    """Request model for cache warming."""
    document_paths: List[str]
    max_documents: Optional[int] = 10

class DocumentProcessingRequest(BaseModel):
    """Request model for document processing."""
    document_paths: List[str]
    chunking_strategy: Optional[str] = "adaptive"
    generate_embeddings: Optional[bool] = True
    max_concurrent: Optional[int] = None

class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis."""
    document_paths: List[str]
    analysis_query: str
    include_full_content: Optional[bool] = False

class ConfigUpdateRequest(BaseModel):
    """Request model for configuration updates."""
    max_chunk_size: Optional[int] = None
    chunk_overlap_ratio: Optional[float] = None
    enable_semantic_scoring: Optional[bool] = None
    max_documents_per_query: Optional[int] = None

@router.get("/status")
async def get_rag_system_status():
    """
    Get Enhanced RAG system status and comprehensive metrics.
    
    Returns detailed information about:
    - System health and uptime
    - Component status
    - Performance metrics
    - Configuration settings
    - Cache statistics
    """
    try:
        rag_service = get_enhanced_rag_service()
        embedding_service = get_embedding_service()
        processing_service = get_document_processing_service()
        
        # Get system status from main service
        system_status = rag_service.get_system_status()
        
        # Get additional service statistics
        embedding_stats = embedding_service.get_service_stats()
        processing_summary = processing_service.get_processing_summary()
        
        return {
            "system_overview": {
                "status": system_status["system_status"],
                "uptime_seconds": system_status["uptime_seconds"],
                "timestamp": time.time()
            },
            "component_health": system_status["component_health"],
            "performance_metrics": {
                "cache_performance": system_status["cache_performance"],
                "embedding_service": {
                    "cache_hit_rate": embedding_stats["cache_hit_rate"],
                    "average_generation_time": embedding_stats["average_generation_time"],
                    "total_requests": embedding_stats["service_stats"]["total_requests"]
                },
                "document_processing": {
                    "success_rate": processing_summary["performance_metrics"]["success_rate"],
                    "average_time_per_document": processing_summary["performance_metrics"]["average_time_per_document"],
                    "total_documents_processed": processing_summary["processing_statistics"]["total_documents_processed"]
                }
            },
            "configuration": system_status["configuration"],
            "supported_features": {
                "semantic_scoring": system_status["configuration"]["semantic_scoring_enabled"],
                "cache_warming": True,
                "batch_processing": True,
                "multi_format_support": True,
                "supported_extensions": system_status["supported_extensions"]
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get RAG system status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve system status: {str(e)}"
        )

@router.post("/cache/warm")
async def warm_rag_cache(request: CacheWarmupRequest):
    """
    Warm the RAG cache with specific documents.
    
    This endpoint processes sample content from documents to pre-populate
    the embedding cache, improving performance for subsequent operations.
    """
    try:
        rag_service = get_enhanced_rag_service()
        
        # Limit documents if specified
        documents = request.document_paths[:request.max_documents]
        
        if not documents:
            return {
                "status": "warning",
                "message": "No documents provided for cache warming",
                "warmed_items": 0
            }
        
        # Warm cache using the service
        result = await rag_service.warm_cache_for_documents(documents)
        
        return {
            "status": result["status"],
            "documents_processed": result["documents_sampled"],
            "cache_items_warmed": result["cache_items_warmed"],
            "cache_statistics": result["cache_stats"],
            "message": f"Cache warming completed for {len(documents)} documents"
        }
        
    except Exception as e:
        logger.error(f"Cache warming failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Cache warming failed: {str(e)}"
        )

@router.get("/cache/stats")
async def get_cache_statistics():
    """
    Get detailed cache statistics and performance metrics.
    """
    try:
        embedding_service = get_embedding_service()
        rag_service = get_enhanced_rag_service()
        
        embedding_stats = embedding_service.get_service_stats()
        system_status = rag_service.get_system_status()
        
        return {
            "cache_performance": system_status["cache_performance"],
            "embedding_service_stats": embedding_stats,
            "recommendations": {
                "cache_hit_rate": embedding_stats["cache_hit_rate"],
                "should_warm_cache": embedding_stats["cache_hit_rate"] < 0.7,
                "performance_grade": (
                    "excellent" if embedding_stats["cache_hit_rate"] > 0.9 else
                    "good" if embedding_stats["cache_hit_rate"] > 0.7 else
                    "needs_improvement"
                )
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get cache statistics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve cache statistics: {str(e)}"
        )

@router.post("/documents/process")
async def process_documents(request: DocumentProcessingRequest):
    """
    Process documents through the Enhanced RAG pipeline.
    
    This endpoint handles complete document processing including:
    - Content extraction
    - Smart chunking
    - Chunk optimization
    - Embedding generation
    """
    try:
        processing_service = get_document_processing_service()
        
        # Convert string strategy to enum
        from ...core.processing.chunking.smart_chunker import ChunkingStrategy
        strategy_map = {
            "fixed": ChunkingStrategy.FIXED,
            "adaptive": ChunkingStrategy.ADAPTIVE,
            "semantic": ChunkingStrategy.SEMANTIC,
            "hybrid": ChunkingStrategy.HYBRID
        }
        
        chunking_strategy = strategy_map.get(
            request.chunking_strategy.lower(), 
            ChunkingStrategy.ADAPTIVE
        )
        
        # Process documents
        result = await processing_service.process_document_batch(
            document_paths=request.document_paths,
            chunking_strategy=chunking_strategy,
            generate_embeddings=request.generate_embeddings,
            max_concurrent=request.max_concurrent
        )
        
        return {
            "processing_summary": {
                "total_documents": result.total_documents,
                "successful_documents": result.successful_documents,
                "failed_documents": result.failed_documents,
                "total_chunks": result.total_chunks,
                "total_embeddings": result.total_embeddings,
                "processing_time": result.processing_time,
                "average_quality": result.average_quality
            },
            "individual_results": [
                {
                    "document_path": r.document_path,
                    "success": r.success,
                    "chunk_count": r.chunk_count,
                    "extraction_quality": r.extraction_quality,
                    "processing_time": r.processing_time,
                    "embeddings_generated": r.embeddings_generated,
                    "errors": r.errors
                }
                for r in result.results
            ],
            "errors": result.errors if result.errors else None
        }
        
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {str(e)}"
        )

@router.post("/documents/analyze")
async def analyze_documents(request: DocumentAnalysisRequest):
    """
    Perform detailed analysis of documents using Enhanced RAG.
    
    This endpoint processes documents and provides AI-generated insights
    based on the analysis query provided.
    """
    try:
        rag_service = get_enhanced_rag_service()
        
        # Perform document analysis
        analysis_result = await rag_service.get_document_analysis(
            document_paths=request.document_paths,
            analysis_query=request.analysis_query,
            include_full_content=request.include_full_content
        )
        
        return {
            "analysis": analysis_result["analysis"],
            "query": analysis_result["query"],
            "documents_analyzed": analysis_result["documents_analyzed"],
            "chunks_used": analysis_result["chunks_used"],
            "processing_metrics": analysis_result["processing_metrics"],
            "document_insights": analysis_result["document_insights"],
            "errors": analysis_result.get("errors", [])
        }
        
    except Exception as e:
        logger.error(f"Document analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Document analysis failed: {str(e)}"
        )

@router.get("/config")
async def get_rag_configuration():
    """
    Get current Enhanced RAG system configuration.
    """
    try:
        config = get_rag_config()
        rag_service = get_enhanced_rag_service()
        system_status = rag_service.get_system_status()
        
        return {
            "current_configuration": system_status["configuration"],
            "feature_flags": {
                "enhanced_rag_enabled": config.enable_enhanced_rag,
                "semantic_scoring_enabled": config.enable_semantic_scoring,
                "cache_warming_enabled": config.cache_warming_enabled,
                "adaptive_batching": config.adaptive_batching
            },
            "performance_settings": {
                "max_batch_size": config.max_batch_size,
                "max_concurrent_batches": config.max_concurrent_batches,
                "memory_pressure_threshold": config.memory_pressure_threshold
            },
            "scoring_weights": {
                "tag_similarity_weight": config.tag_similarity_weight,
                "semantic_similarity_weight": config.semantic_similarity_weight,
                "content_relevance_weight": config.content_relevance_weight,
                "structural_quality_weight": config.structural_quality_weight,
                "freshness_weight": config.freshness_weight
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get RAG configuration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve configuration: {str(e)}"
        )

@router.get("/metrics")
async def get_comprehensive_metrics():
    """
    Get comprehensive performance metrics for the Enhanced RAG system.
    """
    try:
        rag_service = get_enhanced_rag_service()
        embedding_service = get_embedding_service()
        processing_service = get_document_processing_service()
        
        # Get processing metrics
        processing_metrics = rag_service.get_processing_metrics()
        embedding_stats = embedding_service.get_service_stats()
        processing_summary = processing_service.get_processing_summary()
        
        return {
            "overall_metrics": {
                "total_documents_processed": processing_metrics.total_documents,
                "successful_documents": processing_metrics.successful_documents,
                "failed_documents": processing_metrics.failed_documents,
                "total_chunks_processed": processing_metrics.total_chunks,
                "cache_hit_rate": embedding_stats["cache_hit_rate"],
                "average_processing_time": processing_summary["performance_metrics"]["average_time_per_document"],
                "average_quality_score": processing_metrics.average_quality_score
            },
            "cache_metrics": {
                "embedding_cache_hits": processing_metrics.embedding_cache_hits,
                "embedding_cache_misses": processing_metrics.embedding_cache_misses,
                "cache_efficiency": embedding_stats["cache_hit_rate"]
            },
            "performance_insights": {
                "processing_efficiency": processing_summary["performance_metrics"]["success_rate"],
                "average_chunks_per_document": processing_summary["performance_metrics"]["average_chunks_per_document"],
                "embedding_generation_rate": (
                    processing_metrics.total_chunks / processing_metrics.processing_time_seconds
                    if processing_metrics.processing_time_seconds > 0 else 0
                )
            },
            "recommendations": self._generate_performance_recommendations(
                processing_metrics, embedding_stats, processing_summary
            )
        }
        
    except Exception as e:
        logger.error(f"Failed to get comprehensive metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )

@router.post("/cache/clear")
async def clear_rag_cache():
    """
    Clear the RAG embedding cache.
    
    WARNING: This will remove all cached embeddings and may impact performance
    until the cache is warmed up again.
    """
    try:
        rag_service = get_enhanced_rag_service()
        
        # Clear cache through the cache manager
        cache_manager = rag_service.cache_manager
        
        # Get stats before clearing
        stats_before = cache_manager.get_cache_stats()
        
        # Clear the cache
        await cache_manager.clear_cache()
        
        # Get stats after clearing
        stats_after = cache_manager.get_cache_stats()
        
        return {
            "status": "success",
            "message": "RAG cache cleared successfully",
            "cache_stats_before": stats_before,
            "cache_stats_after": stats_after,
            "items_cleared": stats_before.get("size", 0) - stats_after.get("size", 0)
        }
        
    except Exception as e:
        logger.error(f"Failed to clear RAG cache: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear cache: {str(e)}"
        )

def _generate_performance_recommendations(
    processing_metrics: Any,
    embedding_stats: Dict[str, Any],
    processing_summary: Dict[str, Any]
) -> List[str]:
    """Generate performance recommendations based on metrics."""
    recommendations = []
    
    # Cache performance recommendations
    cache_hit_rate = embedding_stats.get("cache_hit_rate", 0)
    if cache_hit_rate < 0.7:
        recommendations.append(
            "Consider warming the cache more frequently to improve performance"
        )
    
    # Processing success rate recommendations
    success_rate = processing_summary["performance_metrics"]["success_rate"]
    if success_rate < 0.9:
        recommendations.append(
            "Review failed document processing to identify common issues"
        )
    
    # Quality score recommendations
    avg_quality = processing_metrics.average_quality_score
    if avg_quality < 0.7:
        recommendations.append(
            "Consider improving document quality or adjusting extraction settings"
        )
    
    # Performance recommendations
    avg_time = processing_summary["performance_metrics"]["average_time_per_document"]
    if avg_time > 5.0:  # seconds
        recommendations.append(
            "Consider optimizing chunk sizes or increasing concurrent processing"
        )
    
    # Default recommendation if everything looks good
    if not recommendations:
        recommendations.append("System performance is operating within optimal parameters")
    
    return recommendations
