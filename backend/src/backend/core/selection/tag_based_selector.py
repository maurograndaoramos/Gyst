"""Tag-based document selector for finding similar documents based on AI-generated tags."""
import asyncio
import logging
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from pathlib import Path
import heapq

from ...schema.document_analysis import TagModel
from ...exceptions.analysis_exceptions import FileAccessError

logger = logging.getLogger(__name__)


@dataclass
class DocumentScore:
    """Document scoring information for selection."""
    file_path: str
    total_score: float
    matching_tags: List[str]
    tag_scores: Dict[str, float]
    
    def __lt__(self, other):
        """For heap operations - higher scores are better."""
        return self.total_score > other.total_score


class TagBasedDocumentSelector:
    """Selects documents based on tag similarity for analysis."""
    
    def __init__(self, max_documents: int = 5):
        """Initialize the selector.
        
        Args:
            max_documents: Maximum number of documents to select per analysis
        """
        self.max_documents = max_documents
    
    async def select_relevant_documents(
        self,
        target_tags: List[TagModel],
        available_documents: Dict[str, List[TagModel]],
        exclude_paths: Optional[List[str]] = None
    ) -> List[str]:
        """Select most relevant documents based on tag similarity.
        
        Args:
            target_tags: Tags from the target document for comparison
            available_documents: Dict mapping file paths to their tags
            exclude_paths: Document paths to exclude from selection
            
        Returns:
            List of selected document paths ordered by relevance
        """
        exclude_paths = exclude_paths or []
        
        if not target_tags:
            logger.warning("No target tags provided for document selection")
            return []
        
        # Calculate scores for all available documents
        document_scores = []
        target_tag_names = {tag.name.lower() for tag in target_tags}
        target_tag_dict = {tag.name.lower(): tag for tag in target_tags}
        
        for doc_path, doc_tags in available_documents.items():
            if doc_path in exclude_paths:
                continue
                
            if not doc_tags:
                continue
            
            score_result = self._calculate_document_score(
                target_tag_dict, doc_tags
            )
            
            if score_result.total_score > 0:
                document_scores.append(DocumentScore(
                    file_path=doc_path,
                    total_score=score_result.total_score,
                    matching_tags=score_result.matching_tags,
                    tag_scores=score_result.tag_scores
                ))
        
        # Select top documents using a heap
        selected_docs = heapq.nlargest(
            self.max_documents, 
            document_scores,
            key=lambda x: x.total_score
        )
        
        result_paths = [doc.file_path for doc in selected_docs]
        
        logger.info(
            f"Selected {len(result_paths)} documents from {len(available_documents)} available. "
            f"Top scores: {[f'{doc.file_path}: {doc.total_score:.3f}' for doc in selected_docs[:3]]}"
        )
        
        return result_paths
    
    def _calculate_document_score(
        self, 
        target_tags: Dict[str, TagModel], 
        doc_tags: List[TagModel]
    ) -> DocumentScore:
        """Calculate similarity score between target tags and document tags.
        
        Args:
            target_tags: Target tags as dict (name -> TagModel)
            doc_tags: Document tags to compare against
            
        Returns:
            DocumentScore with calculated metrics
        """
        matching_tags = []
        tag_scores = {}
        total_score = 0.0
        
        # Create lookup for document tags
        doc_tag_dict = {tag.name.lower(): tag for tag in doc_tags}
        
        # Calculate scores for matching tags
        for tag_name, target_tag in target_tags.items():
            if tag_name in doc_tag_dict:
                doc_tag = doc_tag_dict[tag_name]
                
                # Weight by both confidences - higher confidence tags are more important
                tag_score = (target_tag.confidence + doc_tag.confidence) / 2.0
                
                # Boost score for exact matches
                tag_score *= 1.2
                
                matching_tags.append(tag_name)
                tag_scores[tag_name] = tag_score
                total_score += tag_score
        
        # Add partial credit for similar tags (same category or related terms)
        for doc_tag in doc_tags:
            doc_tag_lower = doc_tag.name.lower()
            if doc_tag_lower not in target_tags:
                # Check for partial matches or category similarity
                partial_score = self._calculate_partial_match_score(
                    doc_tag, list(target_tags.values())
                )
                if partial_score > 0:
                    tag_scores[f"partial_{doc_tag_lower}"] = partial_score
                    total_score += partial_score * 0.3  # Reduced weight for partial matches
        
        # Normalize score by number of target tags to prevent bias toward documents with many tags
        if target_tags:
            total_score = total_score / len(target_tags)
        
        return DocumentScore(
            file_path="",  # Will be set by caller
            total_score=total_score,
            matching_tags=matching_tags,
            tag_scores=tag_scores
        )
    
    def _calculate_partial_match_score(
        self, 
        doc_tag: TagModel, 
        target_tags: List[TagModel]
    ) -> float:
        """Calculate partial match score for related but not identical tags.
        
        Args:
            doc_tag: Document tag to evaluate
            target_tags: List of target tags to compare against
            
        Returns:
            Partial match score (0.0 to 1.0)
        """
        max_partial_score = 0.0
        doc_tag_lower = doc_tag.name.lower()
        
        for target_tag in target_tags:
            target_tag_lower = target_tag.name.lower()
            
            # Category match bonus
            if (doc_tag.category and target_tag.category and 
                doc_tag.category.lower() == target_tag.category.lower()):
                category_score = min(doc_tag.confidence, target_tag.confidence) * 0.5
                max_partial_score = max(max_partial_score, category_score)
            
            # Substring match for related terms
            if (doc_tag_lower in target_tag_lower or target_tag_lower in doc_tag_lower):
                substring_score = min(doc_tag.confidence, target_tag.confidence) * 0.3
                max_partial_score = max(max_partial_score, substring_score)
            
            # Common word analysis for compound tags
            doc_words = set(doc_tag_lower.split())
            target_words = set(target_tag_lower.split())
            common_words = doc_words.intersection(target_words)
            
            if common_words and len(doc_words) > 1 and len(target_words) > 1:
                word_overlap_ratio = len(common_words) / max(len(doc_words), len(target_words))
                word_score = min(doc_tag.confidence, target_tag.confidence) * word_overlap_ratio * 0.4
                max_partial_score = max(max_partial_score, word_score)
        
        return max_partial_score
    
    async def validate_selected_documents(self, file_paths: List[str]) -> List[str]:
        """Validate that selected documents exist and are accessible.
        
        Args:
            file_paths: List of file paths to validate
            
        Returns:
            List of validated file paths (may be shorter than input)
        """
        validated_paths = []
        
        for file_path in file_paths:
            try:
                path_obj = Path(file_path)
                if path_obj.exists() and path_obj.is_file():
                    validated_paths.append(file_path)
                else:
                    logger.warning(f"Document not accessible: {file_path}")
            except Exception as e:
                logger.error(f"Error validating document {file_path}: {str(e)}")
                continue
        
        if len(validated_paths) != len(file_paths):
            logger.info(f"Validated {len(validated_paths)} of {len(file_paths)} selected documents")
        
        return validated_paths


# Global selector instance
_tag_selector: Optional[TagBasedDocumentSelector] = None


def get_tag_based_selector(max_documents: int = 5) -> TagBasedDocumentSelector:
    """Get or create the global tag-based document selector."""
    global _tag_selector
    if _tag_selector is None or _tag_selector.max_documents != max_documents:
        _tag_selector = TagBasedDocumentSelector(max_documents)
    return _tag_selector
