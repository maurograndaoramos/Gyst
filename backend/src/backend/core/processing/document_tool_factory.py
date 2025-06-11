"""Document Tool Factory for CrewAI RAG tools with dynamic tool selection."""
import os
import asyncio
import logging
from typing import Dict, List, Optional, Type, Set, Any, Union
from pathlib import Path
from abc import ABC, abstractmethod

from crewai_tools import TXTSearchTool, PDFSearchTool, DOCXSearchTool, FileReadTool
from crewai.tools import BaseTool
from pydantic import BaseModel

from ...schema.document_analysis import AnalyzeDocumentResponse, TagModel
from ..config import get_settings

logger = logging.getLogger(__name__)


class ToolConfiguration(BaseModel):
    """Configuration for a specific tool type."""
    tool_class: Type[BaseTool]
    extensions: List[str]
    fallback_tools: List[Type[BaseTool]]
    priority: int = 1
    concurrent_limit: int = 5
    config: Optional[Dict[str, Any]] = None


class DocumentToolFactory:
    """Factory for creating appropriate RAG tools based on file extensions."""
    
    def __init__(self, unified_config: Optional[Dict[str, Any]] = None):
        """Initialize the factory with unified LLM configuration."""
        self.settings = get_settings()
        self.unified_config = unified_config or self._get_default_config()
        self._tool_registry: Dict[str, ToolConfiguration] = {}
        self._tool_instances: Dict[str, BaseTool] = {}
        self._initialize_registry()
        
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default unified configuration optimized for pattern recognition."""
        return {
            "llm": {
                "provider": "google",  # Use 'google' instead of 'gemini' for CrewAI tools
                "config": {
                    "model": "gemini-2.0-flash-exp",
                    "temperature": 0.3,  # Lower for consistent pattern recognition
                    "max_tokens": 4096,
                    "top_p": 0.8,       # Focused responses
                }
            },
            "embedder": {
                "provider": "google", 
                "config": {
                    "model": "models/embedding-001",
                    "task_type": "retrieval_document",
                    "title": "Problem Pattern Analysis"
                }
            }
        }
    
    def _initialize_registry(self) -> None:
        """Initialize the tool registry with supported document types."""
        # Register TXTSearchTool for text and markdown files (TextRagTool equivalent)
        self.register_tool_type(
            ToolConfiguration(
                tool_class=TXTSearchTool,  # This serves as TextRagTool
                extensions=['.txt', '.md'],
                fallback_tools=[FileReadTool],
                priority=1,
                concurrent_limit=5,
                config=self.unified_config
            )
        )
        
        # Register PDFSearchTool for PDF files (PdfRagTool)
        self.register_tool_type(
            ToolConfiguration(
                tool_class=PDFSearchTool,  # This serves as PdfRagTool
                extensions=['.pdf'],
                fallback_tools=[TXTSearchTool, FileReadTool],
                priority=1,
                concurrent_limit=3,  # Lower limit for PDF processing
                config=self.unified_config
            )
        )
        
        # Register DOCXSearchTool for Word documents (DocxRagTool)
        self.register_tool_type(
            ToolConfiguration(
                tool_class=DOCXSearchTool,  # This serves as DocxRagTool
                extensions=['.docx'],
                fallback_tools=[TXTSearchTool, FileReadTool],
                priority=1,
                concurrent_limit=3,  # Lower limit for DOCX processing
                config=self.unified_config
            )
        )
    
    def register_tool_type(self, config: ToolConfiguration) -> None:
        """Register a new tool type in the factory."""
        for ext in config.extensions:
            ext_lower = ext.lower()
            if ext_lower in self._tool_registry:
                logger.warning(f"Overriding existing tool registration for extension: {ext_lower}")
            self._tool_registry[ext_lower] = config
            logger.info(f"Registered {config.tool_class.__name__} for extension: {ext_lower}")
    
    def get_supported_extensions(self) -> Set[str]:
        """Get all supported file extensions."""
        return set(self._tool_registry.keys())
    
    def get_tool_for_extension(self, extension: str) -> Optional[Type[BaseTool]]:
        """Get the primary tool class for a given extension."""
        config = self._tool_registry.get(extension.lower())
        return config.tool_class if config else None
    
    def get_fallback_tools(self, extension: str) -> List[Type[BaseTool]]:
        """Get fallback tools for a given extension."""
        config = self._tool_registry.get(extension.lower())
        return config.fallback_tools if config else []
    
    def has_support_for(self, extension: str) -> bool:
        """Check if the factory supports a given file extension."""
        return extension.lower() in self._tool_registry
    
    def create_tool(self, file_path: str, config_override: Optional[Dict[str, Any]] = None) -> BaseTool:
        """Create an appropriate tool for the given file path."""
        # Resolve the file path to the correct location
        resolved_path = self._resolve_file_path(file_path)
        file_ext = resolved_path.suffix.lower()
        
        if not self.has_support_for(file_ext):
            raise ValueError(f"Unsupported file extension: {file_ext}")
        
        tool_config = self._tool_registry[file_ext]
        tool_class = tool_config.tool_class
        
        # Use override config if provided, otherwise use unified config
        final_config = config_override or tool_config.config
        
        try:
            # Create tool instance with the resolved path
            if final_config:
                tool = tool_class(file_path=str(resolved_path), config=final_config)
            else:
                tool = tool_class(file_path=str(resolved_path))
                
            logger.info(f"Created {tool_class.__name__} for file: {resolved_path} (original: {file_path})")
            return tool
            
        except Exception as e:
            logger.error(f"Failed to create {tool_class.__name__} for {resolved_path}: {str(e)}")
            # Try fallback tools
            for fallback_class in tool_config.fallback_tools:
                try:
                    if final_config and fallback_class != FileReadTool:
                        fallback_tool = fallback_class(file_path=str(resolved_path), config=final_config)
                    else:
                        fallback_tool = fallback_class(file_path=str(resolved_path))
                    logger.warning(f"Using fallback tool {fallback_class.__name__} for {resolved_path}")
                    return fallback_tool
                except Exception as fallback_error:
                    logger.error(f"Fallback {fallback_class.__name__} also failed: {str(fallback_error)}")
                    continue
            
            # If all tools fail, raise the original error
            raise e
    
    async def create_tool_async(self, file_path: str, config_override: Optional[Dict[str, Any]] = None) -> BaseTool:
        """Async version of create_tool for better performance."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.create_tool, file_path, config_override)
    
    def get_concurrent_limit(self, extension: str) -> int:
        """Get the concurrent processing limit for a given file extension."""
        config = self._tool_registry.get(extension.lower())
        return config.concurrent_limit if config else 1
    
    def get_tool_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all registered tools."""
        info = {}
        for ext, config in self._tool_registry.items():
            info[ext] = {
                "tool_class": config.tool_class.__name__,
                "fallback_tools": [tool.__name__ for tool in config.fallback_tools],
                "priority": config.priority,
                "concurrent_limit": config.concurrent_limit,
                "has_config": config.config is not None
            }
        return info
    
    def _resolve_file_path(self, file_path: str) -> Path:
        """Resolve file path to the correct location (frontend uploads directory)."""
        path = Path(file_path)
        
        # If it's already an absolute path, use it as-is
        if path.is_absolute():
            return path
        
        # For relative paths, resolve to the project root frontend uploads
        # Backend working dir: /home/caboz/dev/Gyst/backend/
        # Frontend uploads: /home/caboz/dev/Gyst/frontend/uploads/
        # File path: backend/src/backend/core/processing/document_tool_factory.py
        # Need 6 .parent calls: processing -> core -> backend -> src -> backend -> Gyst (project root)
        project_root = Path(__file__).parent.parent.parent.parent.parent.parent  # Go up to project root (6 levels)
        frontend_uploads = project_root / "frontend" / "uploads"
        
        # If path starts with "uploads/", remove it since we're pointing to frontend/uploads
        if str(path).startswith("uploads/"):
            relative_path = str(path)[8:]  # Remove "uploads/" prefix
            resolved_path = frontend_uploads / relative_path
        else:
            resolved_path = frontend_uploads / path
        
        logger.debug(f"Resolved path: {file_path} -> {resolved_path}")
        return resolved_path

    async def validate_file_access(self, file_path: str) -> bool:
        """Validate that a file can be accessed and processed."""
        try:
            # Resolve to the correct path (frontend uploads directory)
            full_path = self._resolve_file_path(file_path)
            
            # Check if file exists
            if not full_path.exists():
                logger.error(f"File does not exist: {full_path} (original: {file_path})")
                return False
            
            # Check if it's actually a file
            if not full_path.is_file():
                logger.error(f"Path is not a file: {full_path}")
                return False
            
            # Check file extension support
            if not self.has_support_for(full_path.suffix):
                logger.error(f"Unsupported file type: {full_path.suffix}")
                return False
            
            # Check file permissions
            if not os.access(full_path, os.R_OK):
                logger.error(f"No read permission for file: {full_path}")
                return False
            
            logger.info(f"File validation successful: {full_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error validating file access for {file_path}: {str(e)}")
            return False
    
    def get_processing_strategy(self, file_paths: List[str]) -> Dict[str, List[str]]:
        """Group files by extension for optimized batch processing."""
        strategy = {}
        
        for file_path in file_paths:
            ext = Path(file_path).suffix.lower()
            if ext not in strategy:
                strategy[ext] = []
            strategy[ext].append(file_path)
        
        # Sort by priority (lower number = higher priority)
        sorted_strategy = {}
        for ext in sorted(strategy.keys(), key=lambda x: self._tool_registry.get(x, ToolConfiguration(
            tool_class=FileReadTool, extensions=[], fallback_tools=[], priority=999
        )).priority):
            sorted_strategy[ext] = strategy[ext]
        
        return sorted_strategy
    
    def create_analysis_batch(
        self, 
        selected_documents: List[str], 
        max_documents: int = 5,
        config_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, List[BaseTool]]:
        """Create a batch of tools for analysis with document limit enforcement.
        
        Args:
            selected_documents: List of document paths selected for analysis
            max_documents: Maximum number of documents to process (default: 5)
            config_override: Optional configuration override for tools
            
        Returns:
            Dictionary mapping file extensions to created tools
        """
        # Enforce document limit
        limited_documents = selected_documents[:max_documents]
        
        if len(selected_documents) > max_documents:
            logger.warning(
                f"Document limit enforced: processing {max_documents} of {len(selected_documents)} documents"
            )
        
        # Group documents by extension for efficient tool creation
        tool_batches = {}
        
        for doc_path in limited_documents:
            file_ext = Path(doc_path).suffix.lower()
            
            if not self.has_support_for(file_ext):
                logger.warning(f"Skipping unsupported file type: {file_ext} for {doc_path}")
                continue
            
            if file_ext not in tool_batches:
                tool_batches[file_ext] = []
            
            try:
                tool = self.create_tool(doc_path, config_override)
                tool_batches[file_ext].append(tool)
                
            except Exception as e:
                logger.error(f"Failed to create tool for {doc_path}: {str(e)}")
                continue
        
        total_tools = sum(len(tools) for tools in tool_batches.values())
        logger.info(f"Created analysis batch: {total_tools} tools across {len(tool_batches)} file types")
        
        return tool_batches


# Global factory instance
_document_tool_factory: Optional[DocumentToolFactory] = None


def get_document_tool_factory() -> DocumentToolFactory:
    """Get or create the global document tool factory instance."""
    global _document_tool_factory
    if _document_tool_factory is None:
        _document_tool_factory = DocumentToolFactory()
    return _document_tool_factory


def reset_factory() -> None:
    """Reset the global factory instance (useful for testing)."""
    global _document_tool_factory
    _document_tool_factory = None
