"""Enhanced content extraction with metadata preservation for RAG processing."""
import re
import logging
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from pathlib import Path
from abc import ABC, abstractmethod
import mimetypes

logger = logging.getLogger(__name__)

@dataclass
class ExtractionMetadata:
    """Metadata extracted from document content."""
    title: Optional[str] = None
    headers: List[str] = field(default_factory=list)
    tables: List[Dict[str, Any]] = field(default_factory=list)
    code_blocks: List[Dict[str, str]] = field(default_factory=list)
    links: List[Dict[str, str]] = field(default_factory=list)
    images: List[Dict[str, str]] = field(default_factory=list)
    lists: List[Dict[str, Any]] = field(default_factory=list)
    citations: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    structure_score: float = 1.0  # How well-structured the document is
    readability_score: float = 1.0  # Content readability assessment
    content_type: str = "text"  # text, code, mixed, structured
    language: Optional[str] = None
    estimated_reading_time_minutes: int = 0

@dataclass
class ExtractedContent:
    """Container for extracted content with enhanced metadata."""
    raw_content: str
    cleaned_content: str
    metadata: ExtractionMetadata
    extraction_quality: float  # 0.0 to 1.0, how successful the extraction was
    processing_notes: List[str] = field(default_factory=list)

class BaseContentExtractor(ABC):
    """Base class for content extractors."""
    
    @abstractmethod
    def can_extract(self, file_path: str) -> bool:
        """Check if extractor can handle this file type."""
        pass
    
    @abstractmethod
    def extract_content(self, file_path: str) -> ExtractedContent:
        """Extract content from file."""
        pass

class TextContentExtractor(BaseContentExtractor):
    """Extractor for plain text files."""
    
    def can_extract(self, file_path: str) -> bool:
        """Check if file is plain text."""
        return Path(file_path).suffix.lower() in ['.txt', '.text']
    
    def extract_content(self, file_path: str) -> ExtractedContent:
        """Extract content from text file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Clean content
            cleaned_content = self._clean_text_content(content)
            
            # Extract metadata
            metadata = self._extract_text_metadata(content, file_path)
            
            return ExtractedContent(
                raw_content=content,
                cleaned_content=cleaned_content,
                metadata=metadata,
                extraction_quality=1.0,
                processing_notes=["Successfully extracted plain text content"]
            )
            
        except Exception as e:
            logger.error(f"Failed to extract text content from {file_path}: {e}")
            return ExtractedContent(
                raw_content="",
                cleaned_content="",
                metadata=ExtractionMetadata(),
                extraction_quality=0.0,
                processing_notes=[f"Extraction failed: {str(e)}"]
            )
    
    def _clean_text_content(self, content: str) -> str:
        """Clean text content."""
        # Remove excessive whitespace
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        cleaned = re.sub(r'[ \t]+', ' ', cleaned)
        return cleaned.strip()
    
    def _extract_text_metadata(self, content: str, file_path: str) -> ExtractionMetadata:
        """Extract metadata from text content."""
        metadata = ExtractionMetadata()
        
        # Estimate reading time (average 200 words per minute)
        word_count = len(content.split())
        metadata.estimated_reading_time_minutes = max(1, word_count // 200)
        
        # Extract potential headers (lines that are all caps or start with numbers)
        lines = content.split('\n')
        for line in lines:
            stripped = line.strip()
            if stripped and (stripped.isupper() or re.match(r'^\d+\.?\s+[A-Z]', stripped)):
                metadata.headers.append(stripped)
        
        # Simple readability assessment based on sentence structure
        sentences = re.split(r'[.!?]+', content)
        if sentences:
            avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
            metadata.readability_score = max(0.1, min(1.0, 1.0 - (avg_sentence_length - 15) / 50))
        
        metadata.content_type = "text"
        return metadata

class MarkdownContentExtractor(BaseContentExtractor):
    """Extractor for Markdown files."""
    
    def can_extract(self, file_path: str) -> bool:
        """Check if file is Markdown."""
        return Path(file_path).suffix.lower() in ['.md', '.markdown', '.mdown']
    
    def extract_content(self, file_path: str) -> ExtractedContent:
        """Extract content from Markdown file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Clean content while preserving structure
            cleaned_content = self._clean_markdown_content(content)
            
            # Extract rich metadata
            metadata = self._extract_markdown_metadata(content, file_path)
            
            return ExtractedContent(
                raw_content=content,
                cleaned_content=cleaned_content,
                metadata=metadata,
                extraction_quality=1.0,
                processing_notes=["Successfully extracted Markdown content with structure preservation"]
            )
            
        except Exception as e:
            logger.error(f"Failed to extract Markdown content from {file_path}: {e}")
            return ExtractedContent(
                raw_content="",
                cleaned_content="",
                metadata=ExtractionMetadata(),
                extraction_quality=0.0,
                processing_notes=[f"Extraction failed: {str(e)}"]
            )
    
    def _clean_markdown_content(self, content: str) -> str:
        """Clean Markdown content while preserving structure."""
        # Remove excessive whitespace but preserve markdown structure
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        return cleaned.strip()
    
    def _extract_markdown_metadata(self, content: str, file_path: str) -> ExtractionMetadata:
        """Extract metadata from Markdown content."""
        metadata = ExtractionMetadata()
        
        # Extract title (first H1 header)
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if title_match:
            metadata.title = title_match.group(1).strip()
        
        # Extract headers
        headers = re.findall(r'^(#{1,6})\s+(.+)$', content, re.MULTILINE)
        metadata.headers = [header[1].strip() for header in headers]
        
        # Extract code blocks
        code_blocks = re.findall(r'```(\w*)\n(.*?)\n```', content, re.DOTALL)
        for lang, code in code_blocks:
            metadata.code_blocks.append({
                "language": lang or "text",
                "content": code.strip()
            })
        
        # Extract links
        links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
        for text, url in links:
            metadata.links.append({
                "text": text,
                "url": url
            })
        
        # Extract images
        images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', content)
        for alt_text, url in images:
            metadata.images.append({
                "alt_text": alt_text,
                "url": url
            })
        
        # Extract lists
        list_items = re.findall(r'^[\s]*[-*+]\s+(.+)$', content, re.MULTILINE)
        if list_items:
            metadata.lists.append({
                "type": "unordered",
                "items": list_items
            })
        
        numbered_items = re.findall(r'^[\s]*\d+\.\s+(.+)$', content, re.MULTILINE)
        if numbered_items:
            metadata.lists.append({
                "type": "ordered",
                "items": numbered_items
            })
        
        # Extract tables
        table_pattern = r'\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)'
        tables = re.findall(table_pattern, content)
        for header_row, data_rows in tables:
            headers = [h.strip() for h in header_row.split('|') if h.strip()]
            rows = []
            for row in data_rows.strip().split('\n'):
                if row.strip() and '|' in row:
                    cells = [c.strip() for c in row.split('|') if c.strip()]
                    if cells:
                        rows.append(cells)
            
            if headers and rows:
                metadata.tables.append({
                    "headers": headers,
                    "rows": rows
                })
        
        # Calculate structure score based on content organization
        structure_elements = len(metadata.headers) + len(metadata.code_blocks) + len(metadata.tables)
        content_length = len(content)
        if content_length > 0:
            metadata.structure_score = min(1.0, structure_elements / (content_length / 1000))
        
        # Estimate reading time
        word_count = len(content.split())
        metadata.estimated_reading_time_minutes = max(1, word_count // 200)
        
        metadata.content_type = "structured" if structure_elements > 3 else "text"
        return metadata

class CodeContentExtractor(BaseContentExtractor):
    """Extractor for code files."""
    
    def can_extract(self, file_path: str) -> bool:
        """Check if file is a code file."""
        code_extensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.swift']
        return Path(file_path).suffix.lower() in code_extensions
    
    def extract_content(self, file_path: str) -> ExtractedContent:
        """Extract content from code file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Clean content
            cleaned_content = self._clean_code_content(content)
            
            # Extract code-specific metadata
            metadata = self._extract_code_metadata(content, file_path)
            
            return ExtractedContent(
                raw_content=content,
                cleaned_content=cleaned_content,
                metadata=metadata,
                extraction_quality=1.0,
                processing_notes=["Successfully extracted code content with syntax preservation"]
            )
            
        except Exception as e:
            logger.error(f"Failed to extract code content from {file_path}: {e}")
            return ExtractedContent(
                raw_content="",
                cleaned_content="",
                metadata=ExtractionMetadata(),
                extraction_quality=0.0,
                processing_notes=[f"Extraction failed: {str(e)}"]
            )
    
    def _clean_code_content(self, content: str) -> str:
        """Clean code content while preserving syntax."""
        # Remove excessive blank lines but preserve code structure
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        return cleaned.strip()
    
    def _extract_code_metadata(self, content: str, file_path: str) -> ExtractionMetadata:
        """Extract metadata from code content."""
        metadata = ExtractionMetadata()
        file_ext = Path(file_path).suffix.lower()
        
        # Detect language
        language_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift'
        }
        metadata.language = language_map.get(file_ext, 'text')
        
        # Extract functions/methods (simplified patterns)
        if file_ext == '.py':
            functions = re.findall(r'^(?:async\s+)?def\s+(\w+)\s*\(', content, re.MULTILINE)
            classes = re.findall(r'^class\s+(\w+)(?:\([^)]*\))?:', content, re.MULTILINE)
            metadata.headers.extend([f"function: {f}" for f in functions])
            metadata.headers.extend([f"class: {c}" for c in classes])
        elif file_ext in ['.js', '.ts']:
            functions = re.findall(r'(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))', content)
            metadata.headers.extend([f"function: {f[0] or f[1]}" for f in functions if f[0] or f[1]])
        
        # Extract comments as documentation
        if file_ext == '.py':
            docstrings = re.findall(r'"""(.*?)"""', content, re.DOTALL)
            comments = re.findall(r'#\s*(.+)', content)
        elif file_ext in ['.js', '.ts', '.java', '.cpp', '.c', '.cs']:
            docstrings = re.findall(r'/\*\*(.*?)\*/', content, re.DOTALL)
            comments = re.findall(r'//\s*(.+)', content)
        else:
            docstrings = []
            comments = []
        
        # Extract imports/includes
        if file_ext == '.py':
            imports = re.findall(r'^(?:from\s+\S+\s+)?import\s+(.+)', content, re.MULTILINE)
            metadata.keywords.extend([imp.strip() for imp in imports])
        elif file_ext in ['.js', '.ts']:
            imports = re.findall(r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]', content)
            metadata.keywords.extend(imports)
        
        # Calculate structure score based on code organization
        function_count = len([h for h in metadata.headers if h.startswith('function:')])
        class_count = len([h for h in metadata.headers if h.startswith('class:')])
        lines_of_code = len([line for line in content.split('\n') if line.strip() and not line.strip().startswith('#')])
        
        if lines_of_code > 0:
            metadata.structure_score = min(1.0, (function_count + class_count * 2) / (lines_of_code / 50))
        
        # Estimate reading time (code takes longer to read)
        word_count = len(content.split())
        metadata.estimated_reading_time_minutes = max(1, word_count // 100)  # Slower reading for code
        
        metadata.content_type = "code"
        return metadata

class ContentExtractor:
    """Main content extractor that delegates to specific extractors."""
    
    def __init__(self):
        """Initialize content extractor with available extractors."""
        self.extractors: List[BaseContentExtractor] = [
            MarkdownContentExtractor(),
            CodeContentExtractor(),
            TextContentExtractor(),  # Keep as fallback
        ]
        
        logger.info(f"Content extractor initialized with {len(self.extractors)} extractors")
    
    def extract_content(self, file_path: str) -> ExtractedContent:
        """Extract content from file using appropriate extractor.
        
        Args:
            file_path: Path to file to extract content from
            
        Returns:
            ExtractedContent with raw content, cleaned content, and metadata
        """
        if not Path(file_path).exists():
            return ExtractedContent(
                raw_content="",
                cleaned_content="",
                metadata=ExtractionMetadata(),
                extraction_quality=0.0,
                processing_notes=[f"File not found: {file_path}"]
            )
        
        # Find appropriate extractor
        for extractor in self.extractors:
            if extractor.can_extract(file_path):
                logger.info(f"Using {extractor.__class__.__name__} for {file_path}")
                result = extractor.extract_content(file_path)
                
                # Add file-level metadata
                self._add_file_metadata(result, file_path)
                
                return result
        
        # No specific extractor found, try generic text extraction
        logger.warning(f"No specific extractor found for {file_path}, using generic text extraction")
        return self._generic_text_extraction(file_path)
    
    def _add_file_metadata(self, extracted_content: ExtractedContent, file_path: str):
        """Add file-level metadata to extracted content."""
        path_obj = Path(file_path)
        
        # Add file info to metadata
        extracted_content.metadata.title = extracted_content.metadata.title or path_obj.stem
        
        # Detect MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type:
            extracted_content.processing_notes.append(f"MIME type: {mime_type}")
        
        # Add file size info
        try:
            file_size = path_obj.stat().st_size
            extracted_content.processing_notes.append(f"File size: {file_size} bytes")
        except Exception:
            pass
    
    def _generic_text_extraction(self, file_path: str) -> ExtractedContent:
        """Generic text extraction as fallback."""
        try:
            # Try multiple encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            content = None
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                raise ValueError("Could not decode file with any supported encoding")
            
            # Basic cleaning
            cleaned_content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
            cleaned_content = cleaned_content.strip()
            
            # Basic metadata
            metadata = ExtractionMetadata()
            metadata.content_type = "text"
            metadata.estimated_reading_time_minutes = max(1, len(content.split()) // 200)
            
            return ExtractedContent(
                raw_content=content,
                cleaned_content=cleaned_content,
                metadata=metadata,
                extraction_quality=0.7,  # Lower quality for generic extraction
                processing_notes=["Used generic text extraction as fallback"]
            )
            
        except Exception as e:
            logger.error(f"Generic text extraction failed for {file_path}: {e}")
            return ExtractedContent(
                raw_content="",
                cleaned_content="",
                metadata=ExtractionMetadata(),
                extraction_quality=0.0,
                processing_notes=[f"All extraction methods failed: {str(e)}"]
            )
    
    def get_extraction_stats(self, extracted_content: ExtractedContent) -> Dict[str, Any]:
        """Get statistics about extracted content."""
        metadata = extracted_content.metadata
        
        return {
            "content_length": len(extracted_content.cleaned_content),
            "raw_content_length": len(extracted_content.raw_content),
            "extraction_quality": extracted_content.extraction_quality,
            "content_type": metadata.content_type,
            "structure_score": metadata.structure_score,
            "readability_score": metadata.readability_score,
            "estimated_reading_time": metadata.estimated_reading_time_minutes,
            "headers_count": len(metadata.headers),
            "code_blocks_count": len(metadata.code_blocks),
            "tables_count": len(metadata.tables),
            "links_count": len(metadata.links),
            "processing_notes": extracted_content.processing_notes
        }
    
    def batch_extract(self, file_paths: List[str]) -> Dict[str, ExtractedContent]:
        """Extract content from multiple files.
        
        Args:
            file_paths: List of file paths to extract content from
            
        Returns:
            Dictionary mapping file paths to extracted content
        """
        results = {}
        
        for file_path in file_paths:
            try:
                results[file_path] = self.extract_content(file_path)
            except Exception as e:
                logger.error(f"Batch extraction failed for {file_path}: {e}")
                results[file_path] = ExtractedContent(
                    raw_content="",
                    cleaned_content="",
                    metadata=ExtractionMetadata(),
                    extraction_quality=0.0,
                    processing_notes=[f"Batch extraction failed: {str(e)}"]
                )
        
        logger.info(f"Batch extracted content from {len(results)} files")
        return results

# Global extractor instance
_content_extractor: Optional[ContentExtractor] = None

def get_content_extractor() -> ContentExtractor:
    """Get or create the global content extractor instance."""
    global _content_extractor
    if _content_extractor is None:
        _content_extractor = ContentExtractor()
    return _content_extractor
