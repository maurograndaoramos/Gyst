"""Document reference extractor for parsing @filename mentions in chat messages."""

import re
import logging
from typing import List, Set, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class DocumentReference:
    """Represents a document reference extracted from a message."""
    original_text: str  # The full @filename.pdf text as it appeared
    filename: str       # The clean filename without @
    start_pos: int     # Position in the original message
    end_pos: int       # End position in the original message

class DocumentReferenceExtractor:
    """Extracts document references (@filename) from chat messages."""
    
    def __init__(self):
        """Initialize the document reference extractor."""
        # Pattern to match @filename.extension with optional quotes
        # Supports: @file.pdf, @"file with spaces.pdf", @file_name.docx, etc.
        self.reference_pattern = re.compile(
            r'@(?:"([^"]+\.[a-zA-Z0-9]+)"|([^\s@]+\.[a-zA-Z0-9]+))',
            re.IGNORECASE
        )
        
        # Supported file extensions
        self.supported_extensions = {
            '.pdf', '.txt', '.md', '.docx', '.doc'
        }
    
    def extract_references(self, message: str) -> List[DocumentReference]:
        """
        Extract all document references from a message.
        
        Args:
            message: The chat message to parse
            
        Returns:
            List of DocumentReference objects found in the message
        """
        references = []
        
        try:
            for match in self.reference_pattern.finditer(message):
                # Get the filename (either quoted or unquoted)
                filename = match.group(1) if match.group(1) else match.group(2)
                
                # Validate file extension
                if not self._has_supported_extension(filename):
                    logger.debug(f"Skipping unsupported file type: {filename}")
                    continue
                
                reference = DocumentReference(
                    original_text=match.group(0),
                    filename=filename.strip(),
                    start_pos=match.start(),
                    end_pos=match.end()
                )
                
                references.append(reference)
                logger.debug(f"Extracted document reference: {reference.filename}")
            
        except Exception as e:
            logger.error(f"Error extracting document references: {e}")
        
        return references
    
    def get_unique_filenames(self, message: str) -> Set[str]:
        """
        Get unique filenames referenced in a message.
        
        Args:
            message: The chat message to parse
            
        Returns:
            Set of unique filenames
        """
        references = self.extract_references(message)
        return {ref.filename for ref in references}
    
    def remove_references_from_message(self, message: str) -> Tuple[str, List[str]]:
        """
        Remove document references from message and return clean message with extracted filenames.
        
        Args:
            message: The original message with @filename references
            
        Returns:
            Tuple of (clean_message, list_of_filenames)
        """
        references = self.extract_references(message)
        
        if not references:
            return message, []
        
        # Sort references by position in reverse order to avoid index shifting
        references.sort(key=lambda x: x.start_pos, reverse=True)
        
        clean_message = message
        filenames = []
        
        for ref in references:
            # Remove the @filename from the message
            clean_message = (
                clean_message[:ref.start_pos] + 
                clean_message[ref.end_pos:]
            )
            filenames.append(ref.filename)
        
        # Reverse filenames list to maintain original order
        filenames.reverse()
        
        # Clean up extra whitespace
        clean_message = ' '.join(clean_message.split())
        
        return clean_message, filenames
    
    def replace_references_with_resolved_paths(
        self, 
        message: str, 
        filename_to_path_mapping: dict
    ) -> str:
        """
        Replace @filename references with resolved file paths or remove invalid ones.
        
        Args:
            message: Original message with @filename references
            filename_to_path_mapping: Dict mapping filenames to resolved paths
            
        Returns:
            Message with references replaced or removed
        """
        references = self.extract_references(message)
        
        if not references:
            return message
        
        # Sort references by position in reverse order
        references.sort(key=lambda x: x.start_pos, reverse=True)
        
        modified_message = message
        
        for ref in references:
            if ref.filename in filename_to_path_mapping:
                # Replace with resolved path (keep @ for backend processing)
                resolved_path = filename_to_path_mapping[ref.filename]
                replacement = f"@{resolved_path}"
                modified_message = (
                    modified_message[:ref.start_pos] + 
                    replacement + 
                    modified_message[ref.end_pos:]
                )
                logger.debug(f"Replaced {ref.original_text} with {replacement}")
            else:
                # Remove invalid reference
                modified_message = (
                    modified_message[:ref.start_pos] + 
                    modified_message[ref.end_pos:]
                )
                logger.warning(f"Removed invalid document reference: {ref.original_text}")
        
        # Clean up extra whitespace
        modified_message = ' '.join(modified_message.split())
        
        return modified_message
    
    def _has_supported_extension(self, filename: str) -> bool:
        """Check if filename has a supported extension."""
        try:
            # Extract extension and normalize
            ext = '.' + filename.split('.')[-1].lower()
            return ext in self.supported_extensions
        except (IndexError, AttributeError):
            return False
    
    def validate_message(self, message: str) -> Tuple[bool, List[str]]:
        """
        Validate a message and return any issues with document references.
        
        Args:
            message: Message to validate
            
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        references = self.extract_references(message)
        
        for ref in references:
            # Check for empty filename
            if not ref.filename.strip():
                issues.append(f"Empty filename in reference: {ref.original_text}")
            
            # Check for very long filenames
            if len(ref.filename) > 255:
                issues.append(f"Filename too long: {ref.filename[:50]}...")
            
            # Check for invalid characters (basic validation)
            invalid_chars = ['<', '>', ':', '"', '|', '?', '*']
            if any(char in ref.filename for char in invalid_chars):
                issues.append(f"Invalid characters in filename: {ref.filename}")
        
        return len(issues) == 0, issues

# Global extractor instance
_document_reference_extractor = None

def get_document_reference_extractor() -> DocumentReferenceExtractor:
    """Get or create the global document reference extractor instance."""
    global _document_reference_extractor
    if _document_reference_extractor is None:
        _document_reference_extractor = DocumentReferenceExtractor()
    return _document_reference_extractor
