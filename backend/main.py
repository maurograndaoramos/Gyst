"""Main application entry point for the backend FastAPI service."""
import logging
import signal
import asyncio
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.backend.api.routes.documents import router as documents_router
from src.backend.api.routes.rag import router as rag_router
from src.backend.core.config import get_settings
from src.backend.core.config.rag_config import get_rag_config
from src.backend.core.error_handling.circuit_breaker import get_circuit_breaker_manager
from src.backend.core.services.enhanced_rag_service import get_enhanced_rag_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Global shutdown event
shutdown_event = asyncio.Event()

async def graceful_shutdown():
    """Handle graceful shutdown of services."""
    logger.info("Starting graceful shutdown...")
    
    try:
        # Reset circuit breakers
        circuit_manager = get_circuit_breaker_manager()
        await circuit_manager.reset_all()
        logger.info("Circuit breakers reset")
        
        # Add any other cleanup tasks here
        # e.g., close database connections, save pending data, etc.
        
        logger.info("Graceful shutdown completed")
    except Exception as e:
        logger.error(f"Error during graceful shutdown: {e}")

def signal_handler(signum, frame):
    """Handle shutdown signals."""
    logger.info(f"Received signal {signum}, initiating graceful shutdown")
    shutdown_event.set()

# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Starting GYST Document Analysis API")
    
    # Initialize circuit breaker manager
    circuit_manager = get_circuit_breaker_manager()
    logger.info("Circuit breaker manager initialized")
    
    # Initialize Enhanced RAG system
    try:
        rag_config = get_rag_config()
        logger.info(f"Enhanced RAG system enabled: {rag_config.enable_enhanced_rag}")
        
        if rag_config.enable_enhanced_rag:
            # Initialize Enhanced RAG service (will trigger initialization of all components)
            rag_service = get_enhanced_rag_service()
            logger.info("Enhanced RAG service initialized successfully")
            
            # Create data directory for embedding cache if it doesn't exist
            import os
            cache_dir = os.path.dirname(rag_config.embedding_cache_db_path)
            if cache_dir:
                os.makedirs(cache_dir, exist_ok=True)
                logger.info(f"Ensured cache directory exists: {cache_dir}")
            
            logger.info("Enhanced RAG system startup completed")
        else:
            logger.info("Enhanced RAG system is disabled in configuration")
        
    except Exception as e:
        logger.error(f"Enhanced RAG system startup failed: {e}")
        # System should still start without Enhanced RAG
    
    yield
    
    # Shutdown
    await graceful_shutdown()

# Create FastAPI application
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    debug=settings.debug,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents_router, prefix="/api")
app.include_router(rag_router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint with basic API information."""
    return {
        "message": "GYST Document Analysis API",
        "version": settings.api_version,
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "gyst-backend",
        "version": settings.api_version
    }

if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
