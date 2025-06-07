"""Core module for backend services and configurations."""

# Import main components from reorganized submodules
from .config import get_settings, Settings

# Enhanced RAG Services (only import what exists and is needed)
try:
    from .services import (
        get_enhanced_rag_service, 
        get_embedding_service, 
        get_document_processing_service
    )
    _enhanced_rag_available = True
except ImportError:
    _enhanced_rag_available = False

# Import other components that exist
try:
    from .selection import TagBasedDocumentSelector, get_tag_based_selector
    _selection_available = True
except ImportError:
    _selection_available = False

try:
    from .error_handling import AnalysisFailureHandler, get_error_handler, ErrorInterventionManager
    _error_handling_available = True
except ImportError:
    _error_handling_available = False

# Base exports (always available)
__all__ = [
    # Configuration
    "get_settings", 
    "Settings",
]

# Add Enhanced RAG exports if available
if _enhanced_rag_available:
    __all__.extend([
        "get_enhanced_rag_service",
        "get_embedding_service", 
        "get_document_processing_service"
    ])

# Add selection exports if available
if _selection_available:
    __all__.extend([
        "TagBasedDocumentSelector", 
        "get_tag_based_selector"
    ])

# Add error handling exports if available
if _error_handling_available:
    __all__.extend([
        "AnalysisFailureHandler", 
        "get_error_handler",
        "ErrorInterventionManager"
    ])
