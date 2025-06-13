"""Database utilities for backend document resolution."""

import os
import logging
from pathlib import Path
from typing import List, Dict, Optional, Any
import sqlite3
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class DatabaseDocument:
    """Document record from database."""
    id: str
    title: str
    file_path: str
    original_filename: str
    mime_type: Optional[str]
    organization_id: str
    analysis_status: str

class DatabaseConnection:
    """SQLite database connection for document queries."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize database connection.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path or self._get_default_db_path()
        self.connection = None
        logger.info(f"Database connection initialized with path: {self.db_path}")
    
    def _get_default_db_path(self) -> str:
        """Get default database path from environment or frontend location."""
        # Try environment variable first
        env_db_path = os.getenv('DATABASE_URL')
        if env_db_path:
            return env_db_path
        
        # Try to find frontend database
        current_dir = Path(__file__).parent
        possible_paths = [
            # From backend/src/backend/core/ to frontend/
            current_dir / ".." / ".." / ".." / ".." / "frontend" / "db.sqlite",
            # Alternative paths
            Path.cwd() / "frontend" / "db.sqlite",
            Path.cwd().parent / "frontend" / "db.sqlite" if Path.cwd().name == "backend" else None,
        ]
        
        for path in possible_paths:
            if path and path.exists():
                logger.info(f"Found database at: {path}")
                return str(path)
        
        # Fallback to a default location
        default_path = current_dir / ".." / ".." / ".." / ".." / "frontend" / "db.sqlite"
        logger.warning(f"Database not found, using default path: {default_path}")
        return str(default_path)
    
    def connect(self) -> sqlite3.Connection:
        """Get database connection."""
        if not self.connection:
            try:
                if not Path(self.db_path).exists():
                    raise FileNotFoundError(f"Database file not found: {self.db_path}")
                
                self.connection = sqlite3.connect(self.db_path)
                self.connection.row_factory = sqlite3.Row  # Enable dict-like access
                logger.info("Database connection established")
            except Exception as e:
                logger.error(f"Failed to connect to database: {e}")
                raise
        
        return self.connection
    
    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            self.connection = None
            logger.info("Database connection closed")
    
    def __enter__(self):
        """Context manager entry."""
        return self.connect()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()

class DocumentDatabase:
    """Database operations for document resolution."""
    
    def __init__(self, db_connection: DatabaseConnection):
        """Initialize with database connection."""
        self.db_connection = db_connection
    
    def find_document_by_filename(
        self, 
        filename: str, 
        organization_id: str
    ) -> Optional[DatabaseDocument]:
        """
        Find a document by filename in the database.
        
        Args:
            filename: Filename to search for
            organization_id: Organization ID for filtering
            
        Returns:
            DatabaseDocument if found, None otherwise
        """
        try:
            with self.db_connection as conn:
                cursor = conn.cursor()
                
                # Query documents table using the schema from frontend
                query = """
                SELECT id, title, filePath, originalFilename, mimeType, organizationId, analysisStatus
                FROM document 
                WHERE organizationId = ? 
                AND (originalFilename = ? OR title = ?)
                AND analysisStatus = 'completed'
                ORDER BY 
                    CASE 
                        WHEN originalFilename = ? THEN 1
                        WHEN title = ? THEN 2
                        ELSE 3
                    END
                LIMIT 1
                """
                
                cursor.execute(query, [organization_id, filename, filename, filename, filename])
                row = cursor.fetchone()
                
                if row:
                    return DatabaseDocument(
                        id=row['id'],
                        title=row['title'],
                        file_path=row['filePath'],
                        original_filename=row['originalFilename'],
                        mime_type=row['mimeType'],
                        organization_id=row['organizationId'],
                        analysis_status=row['analysisStatus']
                    )
                
                logger.debug(f"Document not found: {filename} in org {organization_id}")
                return None
                
        except Exception as e:
            logger.error(f"Database error finding document {filename}: {e}")
            return None
    
    def find_similar_documents(
        self, 
        filename: str, 
        organization_id: str,
        limit: int = 5
    ) -> List[str]:
        """
        Find similar document names using fuzzy matching.
        
        Args:
            filename: Original filename to match against
            organization_id: Organization ID for filtering
            limit: Maximum number of suggestions
            
        Returns:
            List of similar document names
        """
        suggestions = []
        
        try:
            with self.db_connection as conn:
                cursor = conn.cursor()
                
                # Remove extension for partial matching
                name_without_ext = Path(filename).stem
                
                query = """
                SELECT originalFilename
                FROM document 
                WHERE organizationId = ? 
                AND analysisStatus = 'completed'
                AND (
                    originalFilename LIKE ? OR 
                    title LIKE ? OR
                    originalFilename LIKE ? OR
                    title LIKE ?
                )
                ORDER BY 
                    CASE 
                        WHEN originalFilename = ? THEN 1
                        WHEN originalFilename LIKE ? THEN 2
                        WHEN title LIKE ? THEN 3
                        ELSE 4
                    END
                LIMIT ?
                """
                
                patterns = [
                    f"%{filename}%",  # Contains exact filename
                    f"%{filename}%",  # Contains in title
                    f"%{name_without_ext}%",  # Contains name without extension
                    f"%{name_without_ext}%",  # Contains name in title
                ]
                
                params = [organization_id] + patterns + [
                    filename,  # Exact match priority
                    f"{filename}%",  # Starts with filename
                    f"%{filename}%",  # Contains filename in title
                    limit
                ]
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                suggestions = [row['originalFilename'] for row in rows if row['originalFilename']]
                
                logger.debug(f"Found {len(suggestions)} similar documents for: {filename}")
                
        except Exception as e:
            logger.error(f"Error finding similar documents: {e}")
        
        return suggestions
    
    def get_organization_documents(
        self, 
        organization_id: str,
        limit: int = 100
    ) -> List[DatabaseDocument]:
        """
        Get all documents for an organization.
        
        Args:
            organization_id: Organization ID
            limit: Maximum number of documents to return
            
        Returns:
            List of DatabaseDocument objects
        """
        documents = []
        
        try:
            with self.db_connection as conn:
                cursor = conn.cursor()
                
                query = """
                SELECT id, title, filePath, originalFilename, mimeType, organizationId, analysisStatus
                FROM document 
                WHERE organizationId = ? 
                AND analysisStatus = 'completed'
                ORDER BY updatedAt DESC
                LIMIT ?
                """
                
                cursor.execute(query, [organization_id, limit])
                rows = cursor.fetchall()
                
                for row in rows:
                    documents.append(DatabaseDocument(
                        id=row['id'],
                        title=row['title'],
                        file_path=row['filePath'],
                        original_filename=row['originalFilename'],
                        mime_type=row['mimeType'],
                        organization_id=row['organizationId'],
                        analysis_status=row['analysisStatus']
                    ))
                
                logger.info(f"Retrieved {len(documents)} documents for organization {organization_id}")
                
        except Exception as e:
            logger.error(f"Error getting organization documents: {e}")
        
        return documents
    
    def validate_document_access(
        self, 
        document_id: str, 
        organization_id: str, 
        user_id: str
    ) -> bool:
        """
        Validate that a user has access to a document.
        
        Args:
            document_id: Document ID
            organization_id: Organization ID
            user_id: User ID
            
        Returns:
            True if user has access, False otherwise
        """
        try:
            with self.db_connection as conn:
                cursor = conn.cursor()
                
                # Check if document exists and belongs to the organization
                query = """
                SELECT COUNT(*) as count
                FROM document 
                WHERE id = ? 
                AND organizationId = ?
                """
                
                cursor.execute(query, [document_id, organization_id])
                row = cursor.fetchone()
                
                return row['count'] > 0
                
        except Exception as e:
            logger.error(f"Error validating document access: {e}")
            return False

# Global database instances
_db_connection = None
_document_database = None

def get_database_connection(db_path: Optional[str] = None) -> DatabaseConnection:
    """Get or create the global database connection."""
    global _db_connection
    if _db_connection is None:
        _db_connection = DatabaseConnection(db_path)
    return _db_connection

def get_document_database(db_path: Optional[str] = None) -> DocumentDatabase:
    """Get or create the global document database instance."""
    global _document_database
    if _document_database is None:
        db_conn = get_database_connection(db_path)
        _document_database = DocumentDatabase(db_conn)
    return _document_database

def reset_database_instances():
    """Reset global database instances (useful for testing)."""
    global _db_connection, _document_database
    if _db_connection:
        _db_connection.close()
    _db_connection = None
    _document_database = None
