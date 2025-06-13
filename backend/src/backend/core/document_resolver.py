"""Document resolver for finding actual file paths from database."""

import logging
from typing import List, Dict, Optional, Tuple, Union
from pathlib import Path
from dataclasses import dataclass

from .database import get_document_database, DatabaseDocument, DocumentDatabase

logger = logging.getLogger(__name__)

@dataclass
class ResolvedDocument:
    """Represents a resolved document with database information."""
    id: str
    filename: str  # The filename user referenced
    file_path: str  # Actual file path from database
    title: str
    mime_type: Optional[str] = None
    organization_id: Optional[str] = None

class DocumentResolver:
    """Resolves document filenames to actual file paths using the database."""
    
    def __init__(self, db_connection: Optional[Union[DocumentDatabase, object]] = None):
        """
        Initialize the document resolver.
        
        Args:
            db_connection: Database connection (will be injected in actual usage)
        """
        self.db = db_connection
    
    async def resolve_documents(
        self, 
        filenames: List[str], 
        organization_id: str,
        user_id: str
    ) -> Dict[str, ResolvedDocument]:
        """
        Resolve a list of filenames to their actual file paths.
        
        Args:
            filenames: List of filenames to resolve
            organization_id: Organization ID for filtering
            user_id: User ID for access control
            
        Returns:
            Dictionary mapping filename to ResolvedDocument
        """
        resolved: Dict[str, ResolvedDocument] = {}
        
        if not filenames:
            return resolved
        
        try:
            # For now, we'll simulate the database query
            # In actual implementation, this would use proper database queries
            for filename in filenames:
                document = await self._find_document_by_filename(
                    filename, organization_id, user_id
                )
                if document:
                    resolved[filename] = document
                    logger.info(f"Resolved document: {filename} -> {document.file_path}")
                else:
                    logger.warning(f"Could not resolve document: {filename}")
        
        except Exception as e:
            logger.error(f"Error resolving documents: {e}")
        
        return resolved
    
    async def _find_document_by_filename(
        self, 
        filename: str, 
        organization_id: str, 
        user_id: str
    ) -> Optional[ResolvedDocument]:
        """
        Find a document by filename in the database.
        
        Args:
            filename: Filename to search for
            organization_id: Organization ID for filtering
            user_id: User ID for access control
            
        Returns:
            ResolvedDocument if found, None otherwise
        """
        try:
            # Get database instance if not injected
            if not self.db:
                doc_db = get_document_database()
            else:
                doc_db = self.db
            
            # Search for document in database
            db_doc = doc_db.find_document_by_filename(filename, organization_id)
            
            if db_doc:
                return ResolvedDocument(
                    id=db_doc.id,
                    filename=filename,
                    file_path=db_doc.file_path,
                    title=db_doc.title,
                    mime_type=db_doc.mime_type,
                    organization_id=db_doc.organization_id
                )
            
            logger.debug(f"Document not found: {filename} in org {organization_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error querying database for {filename}: {e}")
            return None
    
    async def suggest_similar_documents(
        self, 
        filename: str, 
        organization_id: str, 
        user_id: str,
        limit: int = 5
    ) -> List[str]:
        """
        Suggest similar document names when exact match is not found.
        
        Args:
            filename: Original filename that wasn't found
            organization_id: Organization ID for filtering
            user_id: User ID for access control
            limit: Maximum number of suggestions
            
        Returns:
            List of similar document names
        """
        suggestions: List[str] = []
        
        try:
            # Get database instance if not injected
            if not self.db:
                doc_db = get_document_database()
            else:
                doc_db = self.db
            
            # Find similar documents using database fuzzy matching
            suggestions = doc_db.find_similar_documents(filename, organization_id, limit)
            
            logger.debug(f"Found {len(suggestions)} similar documents for: {filename}")
            
        except Exception as e:
            logger.error(f"Error getting suggestions for {filename}: {e}")
        
        return suggestions
    
    def get_document_paths_for_chat(self, resolved_docs: Dict[str, ResolvedDocument]) -> List[str]:
        """
        Extract file paths from resolved documents for chat service.
        
        Args:
            resolved_docs: Dictionary of resolved documents
            
        Returns:
            List of file paths
        """
        return [doc.file_path for doc in resolved_docs.values()]
    
    def create_filename_to_path_mapping(self, resolved_docs: Dict[str, ResolvedDocument]) -> Dict[str, str]:
        """
        Create a mapping from original filenames to resolved paths.
        
        Args:
            resolved_docs: Dictionary of resolved documents
            
        Returns:
            Dictionary mapping filename to file path
        """
        return {filename: doc.file_path for filename, doc in resolved_docs.items()}

class DatabaseDocumentResolver(DocumentResolver):
    """Document resolver that uses actual database queries."""
    
    def __init__(self, db_database: DocumentDatabase):
        """Initialize with document database instance."""
        super().__init__(db_database)

# Global resolver instance
_document_resolver: Optional[DocumentResolver] = None

def get_document_resolver(db_database: Optional[DocumentDatabase] = None) -> DocumentResolver:
    """Get or create the global document resolver instance."""
    global _document_resolver
    if _document_resolver is None:
        if db_database:
            _document_resolver = DatabaseDocumentResolver(db_database)
        else:
            # Use default database instance
            doc_db = get_document_database()
            _document_resolver = DocumentResolver(doc_db)
    
    # Ensure we always return a DocumentResolver
    if _document_resolver is None:
        _document_resolver = DocumentResolver()
    
    return _document_resolver

def reset_resolver():
    """Reset the global resolver instance (useful for testing)."""
    global _document_resolver
    _document_resolver = None
