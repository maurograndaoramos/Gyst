"""Smart chunking strategy with adaptive sizing and semantic boundary preservation."""
import re
import logging
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import tiktoken

logger = logging.getLogger(__name__)

class ChunkingStrategy(str, Enum):
    """Available chunking strategies."""
    ADAPTIVE = "adaptive"  # Adapt to document type and content
    FIXED = "fixed"       # Fixed token size
    SEMANTIC = "semantic" # Preserve semantic boundaries
    HYBRID = "hybrid"     # Combination of adaptive and semantic

@dataclass
class DocumentChunk:
    """Represents a chunk of document content with metadata."""
    content: str
    chunk_index: int
    start_char: int
    end_char: int
    token_count: int
    chunk_type: str  # paragraph, section, code_block, table, etc.
    metadata: Dict[str, Any]
    overlap_with_previous: int = 0
    overlap_with_next: int = 0
    semantic_score: float = 1.0  # How well chunk preserves semantic boundaries

class SmartChunker:
    """Smart document chunker with adaptive sizing and semantic preservation."""
    
    def __init__(self, encoding_name: str = "cl100k_base"):
        """Initialize the smart chunker.
        
        Args:
            encoding_name: Tiktoken encoding to use for token counting
        """
        self.encoding = tiktoken.get_encoding(encoding_name)
        
        # Chunk size configurations by document type
        self.chunk_configs = {
            ".txt": {"size": 512, "overlap": 0.15, "preserve_paragraphs": True},
            ".md": {"size": 512, "overlap": 0.20, "preserve_paragraphs": True},
            ".pdf": {"size": 768, "overlap": 0.15, "preserve_paragraphs": True},
            ".docx": {"size": 768, "overlap": 0.15, "preserve_paragraphs": True},
            ".py": {"size": 1024, "overlap": 0.10, "preserve_functions": True},
            ".js": {"size": 1024, "overlap": 0.10, "preserve_functions": True},
            ".ts": {"size": 1024, "overlap": 0.10, "preserve_functions": True},
            "default": {"size": 512, "overlap": 0.20, "preserve_paragraphs": True}
        }
        
        # Semantic boundary patterns
        self.boundary_patterns = {
            "paragraph": r'\n\s*\n',
            "section": r'\n#+\s+.*\n',  # Markdown headers
            "code_block": r'```[\s\S]*?```',
            "function": r'(def\s+\w+|function\s+\w+|class\s+\w+)',
            "list_item": r'\n\s*[-*+]\s+',
            "table_row": r'\|.*\|',
        }
    
    def chunk_document(
        self, 
        content: str, 
        document_path: str,
        strategy: ChunkingStrategy = ChunkingStrategy.ADAPTIVE,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """Chunk a document using the specified strategy.
        
        Args:
            content: Document content to chunk
            document_path: Path to the document for type detection
            strategy: Chunking strategy to use
            custom_config: Override default chunking configuration
            
        Returns:
            List of document chunks with metadata
        """
        if not content.strip():
            return []
        
        # Get chunking configuration
        file_ext = Path(document_path).suffix.lower()
        config = custom_config or self._get_chunk_config(file_ext)
        
        logger.info(
            f"Chunking document {document_path} with strategy {strategy}, "
            f"target size: {config['size']} tokens, overlap: {config['overlap']:.2%}"
        )
        
        # Apply chunking strategy
        if strategy == ChunkingStrategy.ADAPTIVE:
            chunks = self._adaptive_chunk(content, config, file_ext)
        elif strategy == ChunkingStrategy.SEMANTIC:
            chunks = self._semantic_chunk(content, config)
        elif strategy == ChunkingStrategy.HYBRID:
            chunks = self._hybrid_chunk(content, config, file_ext)
        else:  # FIXED
            chunks = self._fixed_chunk(content, config)
        
        # Add overlap between chunks
        chunks = self._add_chunk_overlap(chunks, content, config['overlap'])
        
        # Calculate semantic scores
        self._calculate_semantic_scores(chunks, content)
        
        logger.info(f"Created {len(chunks)} chunks from document {document_path}")
        return chunks
    
    def _get_chunk_config(self, file_ext: str) -> Dict[str, Any]:
        """Get chunking configuration for file extension."""
        return self.chunk_configs.get(file_ext, self.chunk_configs["default"])
    
    def _adaptive_chunk(
        self, 
        content: str, 
        config: Dict[str, Any], 
        file_ext: str
    ) -> List[DocumentChunk]:
        """Adaptive chunking based on document type and content patterns."""
        target_size = config['size']
        chunks = []
        
        # Different adaptive strategies by file type
        if file_ext in ['.py', '.js', '.ts']:
            chunks = self._chunk_code(content, target_size)
        elif file_ext == '.md':
            chunks = self._chunk_markdown(content, target_size)
        else:
            chunks = self._chunk_text(content, target_size, config.get('preserve_paragraphs', True))
        
        return chunks
    
    def _semantic_chunk(self, content: str, config: Dict[str, Any]) -> List[DocumentChunk]:
        """Semantic chunking that preserves meaningful boundaries."""
        target_size = config['size']
        chunks = []
        
        # Find semantic boundaries
        boundaries = self._find_semantic_boundaries(content)
        
        current_chunk = ""
        current_start = 0
        chunk_index = 0
        
        for boundary_pos, boundary_type in boundaries:
            # Extract text up to boundary
            text_segment = content[current_start:boundary_pos]
            
            # Check if adding this segment would exceed target size
            potential_chunk = current_chunk + text_segment
            token_count = len(self.encoding.encode(potential_chunk))
            
            if token_count > target_size and current_chunk:
                # Create chunk from current content
                chunks.append(self._create_chunk(
                    content=current_chunk.strip(),
                    chunk_index=chunk_index,
                    start_char=current_start - len(current_chunk),
                    end_char=current_start,
                    chunk_type=boundary_type
                ))
                chunk_index += 1
                current_chunk = text_segment
                current_start = boundary_pos
            else:
                current_chunk += text_segment
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(self._create_chunk(
                content=current_chunk.strip(),
                chunk_index=chunk_index,
                start_char=current_start - len(current_chunk),
                end_char=len(content),
                chunk_type="text"
            ))
        
        return chunks
    
    def _hybrid_chunk(
        self, 
        content: str, 
        config: Dict[str, Any], 
        file_ext: str
    ) -> List[DocumentChunk]:
        """Hybrid chunking combining adaptive and semantic strategies."""
        # First try semantic chunking
        semantic_chunks = self._semantic_chunk(content, config)
        
        # If semantic chunks are too large, apply adaptive splitting
        final_chunks = []
        for chunk in semantic_chunks:
            if chunk.token_count > config['size'] * 1.5:  # 50% tolerance
                # Split large semantic chunks using adaptive strategy
                sub_chunks = self._adaptive_chunk(chunk.content, config, file_ext)
                # Update indices and positions
                for i, sub_chunk in enumerate(sub_chunks):
                    sub_chunk.chunk_index = len(final_chunks) + i
                    sub_chunk.start_char += chunk.start_char
                    sub_chunk.end_char += chunk.start_char
                final_chunks.extend(sub_chunks)
            else:
                final_chunks.append(chunk)
        
        # Reindex chunks
        for i, chunk in enumerate(final_chunks):
            chunk.chunk_index = i
        
        return final_chunks
    
    def _fixed_chunk(self, content: str, config: Dict[str, Any]) -> List[DocumentChunk]:
        """Fixed-size chunking with token-based splitting."""
        target_size = config['size']
        chunks = []
        
        # Encode the entire content
        tokens = self.encoding.encode(content)
        
        chunk_index = 0
        for i in range(0, len(tokens), target_size):
            chunk_tokens = tokens[i:i + target_size]
            chunk_content = self.encoding.decode(chunk_tokens)
            
            # Find character positions
            start_char = len(self.encoding.decode(tokens[:i])) if i > 0 else 0
            end_char = len(self.encoding.decode(tokens[:i + len(chunk_tokens)]))
            
            chunks.append(self._create_chunk(
                content=chunk_content,
                chunk_index=chunk_index,
                start_char=start_char,
                end_char=end_char,
                chunk_type="fixed"
            ))
            chunk_index += 1
        
        return chunks
    
    def _chunk_code(self, content: str, target_size: int) -> List[DocumentChunk]:
        """Chunk code preserving function and class boundaries."""
        chunks = []
        
        # Find function/class boundaries
        function_pattern = r'(^(?:def|class|function|const|let|var)\s+\w+.*?)(?=\n(?:def|class|function|const|let|var|\Z)|\Z)'
        matches = list(re.finditer(function_pattern, content, re.MULTILINE | re.DOTALL))
        
        if not matches:
            # Fallback to paragraph-based chunking
            return self._chunk_text(content, target_size, preserve_paragraphs=False)
        
        chunk_index = 0
        current_chunk = ""
        current_start = 0
        
        for match in matches:
            function_code = match.group(1)
            function_tokens = len(self.encoding.encode(function_code))
            
            # If function alone exceeds target size, chunk it separately
            if function_tokens > target_size:
                # Save current chunk if exists
                if current_chunk.strip():
                    chunks.append(self._create_chunk(
                        content=current_chunk.strip(),
                        chunk_index=chunk_index,
                        start_char=current_start,
                        end_char=match.start(),
                        chunk_type="code_block"
                    ))
                    chunk_index += 1
                
                # Split large function
                function_chunks = self._split_large_text(function_code, target_size, "function")
                for func_chunk in function_chunks:
                    func_chunk.chunk_index = chunk_index
                    func_chunk.start_char += match.start()
                    func_chunk.end_char += match.start()
                    chunks.append(func_chunk)
                    chunk_index += 1
                
                current_chunk = ""
                current_start = match.end()
            else:
                # Check if adding function would exceed target size
                potential_chunk = current_chunk + function_code
                if len(self.encoding.encode(potential_chunk)) > target_size and current_chunk:
                    # Save current chunk
                    chunks.append(self._create_chunk(
                        content=current_chunk.strip(),
                        chunk_index=chunk_index,
                        start_char=current_start,
                        end_char=match.start(),
                        chunk_type="code_block"
                    ))
                    chunk_index += 1
                    current_chunk = function_code
                    current_start = match.start()
                else:
                    current_chunk += function_code
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(self._create_chunk(
                content=current_chunk.strip(),
                chunk_index=chunk_index,
                start_char=current_start,
                end_char=len(content),
                chunk_type="code_block"
            ))
        
        return chunks
    
    def _chunk_markdown(self, content: str, target_size: int) -> List[DocumentChunk]:
        """Chunk markdown preserving section boundaries."""
        chunks = []
        
        # Split by headers
        header_pattern = r'^(#{1,6}\s+.*?)$'
        sections = re.split(header_pattern, content, flags=re.MULTILINE)
        
        chunk_index = 0
        current_chunk = ""
        current_start = 0
        char_pos = 0
        
        for section in sections:
            if not section.strip():
                char_pos += len(section)
                continue
            
            section_tokens = len(self.encoding.encode(section))
            
            # If section alone exceeds target size, split it
            if section_tokens > target_size:
                # Save current chunk if exists
                if current_chunk.strip():
                    chunks.append(self._create_chunk(
                        content=current_chunk.strip(),
                        chunk_index=chunk_index,
                        start_char=current_start,
                        end_char=char_pos,
                        chunk_type="section"
                    ))
                    chunk_index += 1
                
                # Split large section
                section_chunks = self._split_large_text(section, target_size, "section")
                for sec_chunk in section_chunks:
                    sec_chunk.chunk_index = chunk_index
                    sec_chunk.start_char += char_pos
                    sec_chunk.end_char += char_pos
                    chunks.append(sec_chunk)
                    chunk_index += 1
                
                current_chunk = ""
                current_start = char_pos + len(section)
            else:
                # Check if adding section would exceed target size
                potential_chunk = current_chunk + section
                if len(self.encoding.encode(potential_chunk)) > target_size and current_chunk:
                    # Save current chunk
                    chunks.append(self._create_chunk(
                        content=current_chunk.strip(),
                        chunk_index=chunk_index,
                        start_char=current_start,
                        end_char=char_pos,
                        chunk_type="section"
                    ))
                    chunk_index += 1
                    current_chunk = section
                    current_start = char_pos
                else:
                    current_chunk += section
            
            char_pos += len(section)
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(self._create_chunk(
                content=current_chunk.strip(),
                chunk_index=chunk_index,
                start_char=current_start,
                end_char=len(content),
                chunk_type="section"
            ))
        
        return chunks
    
    def _chunk_text(self, content: str, target_size: int, preserve_paragraphs: bool = True) -> List[DocumentChunk]:
        """Chunk regular text content."""
        if preserve_paragraphs:
            return self._chunk_by_paragraphs(content, target_size)
        else:
            return self._fixed_chunk(content, {"size": target_size})
    
    def _chunk_by_paragraphs(self, content: str, target_size: int) -> List[DocumentChunk]:
        """Chunk text preserving paragraph boundaries."""
        chunks = []
        paragraphs = re.split(r'\n\s*\n', content)
        
        chunk_index = 0
        current_chunk = ""
        current_start = 0
        char_pos = 0
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                char_pos += len(paragraph) + 2  # Account for paragraph separator
                continue
            
            paragraph_tokens = len(self.encoding.encode(paragraph))
            
            # If paragraph alone exceeds target size, split it
            if paragraph_tokens > target_size:
                # Save current chunk if exists
                if current_chunk.strip():
                    chunks.append(self._create_chunk(
                        content=current_chunk.strip(),
                        chunk_index=chunk_index,
                        start_char=current_start,
                        end_char=char_pos,
                        chunk_type="paragraph"
                    ))
                    chunk_index += 1
                
                # Split large paragraph
                para_chunks = self._split_large_text(paragraph, target_size, "paragraph")
                for para_chunk in para_chunks:
                    para_chunk.chunk_index = chunk_index
                    para_chunk.start_char += char_pos
                    para_chunk.end_char += char_pos
                    chunks.append(para_chunk)
                    chunk_index += 1
                
                current_chunk = ""
                current_start = char_pos + len(paragraph) + 2
            else:
                # Check if adding paragraph would exceed target size
                potential_chunk = current_chunk + "\n\n" + paragraph if current_chunk else paragraph
                if len(self.encoding.encode(potential_chunk)) > target_size and current_chunk:
                    # Save current chunk
                    chunks.append(self._create_chunk(
                        content=current_chunk.strip(),
                        chunk_index=chunk_index,
                        start_char=current_start,
                        end_char=char_pos,
                        chunk_type="paragraph"
                    ))
                    chunk_index += 1
                    current_chunk = paragraph
                    current_start = char_pos
                else:
                    current_chunk = potential_chunk
            
            char_pos += len(paragraph) + 2
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(self._create_chunk(
                content=current_chunk.strip(),
                chunk_index=chunk_index,
                start_char=current_start,
                end_char=len(content),
                chunk_type="paragraph"
            ))
        
        return chunks
    
    def _split_large_text(self, text: str, target_size: int, chunk_type: str) -> List[DocumentChunk]:
        """Split large text that exceeds target size."""
        tokens = self.encoding.encode(text)
        chunks = []
        
        chunk_index = 0
        for i in range(0, len(tokens), target_size):
            chunk_tokens = tokens[i:i + target_size]
            chunk_content = self.encoding.decode(chunk_tokens)
            
            start_char = len(self.encoding.decode(tokens[:i])) if i > 0 else 0
            end_char = len(self.encoding.decode(tokens[:i + len(chunk_tokens)]))
            
            chunks.append(self._create_chunk(
                content=chunk_content,
                chunk_index=chunk_index,
                start_char=start_char,
                end_char=end_char,
                chunk_type=f"split_{chunk_type}"
            ))
            chunk_index += 1
        
        return chunks
    
    def _find_semantic_boundaries(self, content: str) -> List[Tuple[int, str]]:
        """Find semantic boundaries in content."""
        boundaries = []
        
        for boundary_type, pattern in self.boundary_patterns.items():
            for match in re.finditer(pattern, content):
                boundaries.append((match.end(), boundary_type))
        
        # Sort by position
        boundaries.sort(key=lambda x: x[0])
        return boundaries
    
    def _create_chunk(
        self, 
        content: str, 
        chunk_index: int, 
        start_char: int, 
        end_char: int, 
        chunk_type: str
    ) -> DocumentChunk:
        """Create a DocumentChunk with proper metadata."""
        token_count = len(self.encoding.encode(content))
        
        return DocumentChunk(
            content=content,
            chunk_index=chunk_index,
            start_char=start_char,
            end_char=end_char,
            token_count=token_count,
            chunk_type=chunk_type,
            metadata={
                "length": len(content),
                "lines": len(content.split('\n')),
                "words": len(content.split()),
                "density": token_count / len(content) if content else 0
            }
        )
    
    def _add_chunk_overlap(
        self, 
        chunks: List[DocumentChunk], 
        original_content: str, 
        overlap_ratio: float
    ) -> List[DocumentChunk]:
        """Add overlap between consecutive chunks."""
        if len(chunks) <= 1 or overlap_ratio <= 0:
            return chunks
        
        for i in range(1, len(chunks)):
            current_chunk = chunks[i]
            previous_chunk = chunks[i - 1]
            
            # Calculate overlap size in tokens
            overlap_tokens = int(previous_chunk.token_count * overlap_ratio)
            
            if overlap_tokens > 0:
                # Extract overlap from end of previous chunk
                prev_tokens = self.encoding.encode(previous_chunk.content)
                overlap_start = max(0, len(prev_tokens) - overlap_tokens)
                overlap_content = self.encoding.decode(prev_tokens[overlap_start:])
                
                # Prepend to current chunk
                current_chunk.content = overlap_content + "\n" + current_chunk.content
                current_chunk.token_count = len(self.encoding.encode(current_chunk.content))
                current_chunk.overlap_with_previous = len(overlap_content)
                
                # Update previous chunk overlap info
                previous_chunk.overlap_with_next = len(overlap_content)
        
        return chunks
    
    def _calculate_semantic_scores(self, chunks: List[DocumentChunk], original_content: str):
        """Calculate semantic boundary preservation scores for chunks."""
        for chunk in chunks:
            # Simple heuristic: chunks that end at natural boundaries get higher scores
            chunk_end = chunk.start_char + len(chunk.content)
            
            # Check if chunk ends at paragraph break
            if chunk_end < len(original_content):
                next_chars = original_content[chunk_end:chunk_end + 3]
                if re.match(r'\n\s*\n', next_chars):
                    chunk.semantic_score = 1.0
                elif next_chars.startswith('\n'):
                    chunk.semantic_score = 0.8
                else:
                    chunk.semantic_score = 0.6
            else:
                chunk.semantic_score = 1.0  # End of document
    
    def get_chunk_stats(self, chunks: List[DocumentChunk]) -> Dict[str, Any]:
        """Get statistics about chunking results."""
        if not chunks:
            return {}
        
        token_counts = [chunk.token_count for chunk in chunks]
        semantic_scores = [chunk.semantic_score for chunk in chunks]
        
        return {
            "total_chunks": len(chunks),
            "average_tokens": sum(token_counts) / len(token_counts),
            "min_tokens": min(token_counts),
            "max_tokens": max(token_counts),
            "average_semantic_score": sum(semantic_scores) / len(semantic_scores),
            "chunk_types": list(set(chunk.chunk_type for chunk in chunks)),
            "total_overlap_chars": sum(chunk.overlap_with_previous for chunk in chunks)
        }

# Global chunker instance
_smart_chunker: Optional[SmartChunker] = None

def get_smart_chunker() -> SmartChunker:
    """Get or create the global smart chunker instance."""
    global _smart_chunker
    if _smart_chunker is None:
        _smart_chunker = SmartChunker()
    return _smart_chunker
