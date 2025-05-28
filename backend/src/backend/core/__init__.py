"""Core module for backend services and configurations."""

# Import main components from reorganized submodules
from .config import get_settings, Settings
from .services import DocumentAnalysisService, get_document_analysis_service, PatternRecognitionService
from .processing import DocumentToolFactory, get_document_tool_factory, TagRelevantBatchProcessor
from .selection import TagBasedDocumentSelector, get_tag_based_selector, AgentConfigurator, get_agent_configurator
from .error_handling import AnalysisFailureHandler, get_error_handler, ErrorInterventionManager

__all__ = [
    # Configuration
    "get_settings", 
    "Settings",
    
    # Services
    "DocumentAnalysisService", 
    "get_document_analysis_service",
    "PatternRecognitionService",
    
    # Processing
    "DocumentToolFactory", 
    "get_document_tool_factory",
    "TagRelevantBatchProcessor",
    
    # Selection and Configuration
    "TagBasedDocumentSelector", 
    "get_tag_based_selector",
    "AgentConfigurator",
    "get_agent_configurator",
    
    # Error Handling
    "AnalysisFailureHandler", 
    "get_error_handler",
    "ErrorInterventionManager"
]
