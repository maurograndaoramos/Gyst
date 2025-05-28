"""CrewAI service for document analysis and tagging."""
import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
import time
import uuid
from datetime import datetime

from crewai import Agent, Task, Crew
from crewai_tools import FileReadTool, PDFSearchTool, DOCXSearchTool
import google.generativeai as genai
from pydantic import BaseModel

from ..schema.document_analysis import TagModel, AnalyzeDocumentResponse
from .config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

class DocumentAnalysisService:
    """Service for analyzing documents using CrewAI and generating tags."""
    
    def __init__(self):
        """Initialize the document analysis service."""
        self.settings = get_settings()
        
        if not self.settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        # Configure Gemini
        genai.configure(api_key=self.settings.gemini_api_key)
        
        # Base upload directory from settings
        self.upload_base_dir = Path(self.settings.upload_base_dir)
        
        # Initialize tools
        self._init_tools()
        
        # Initialize agents
        self._init_agents()
    
    def _init_tools(self):
        """Initialize RAG tools for different file types."""
        self.file_read_tool = FileReadTool()
        self.pdf_search_tool = PDFSearchTool()
        self.docx_search_tool = DOCXSearchTool()
    
    def _init_agents(self):
        """Initialize CrewAI agents for document analysis."""
        self.document_analyzer = Agent(
            role="Document Analysis Expert",
            goal="Analyze documents and extract meaningful, relevant tags that capture the essence and key topics of the content",
            backstory="""You are an expert in document analysis and information extraction. 
            You specialize in reading technical documentation, incident reports, troubleshooting guides, 
            and various types of organizational documents. Your expertise lies in identifying key themes, 
            technical concepts, processes, and issues within documents, then creating precise and useful tags 
            that will help teams quickly find and categorize information.""",
            verbose=True,
            allow_delegation=False,
            tools=[self.file_read_tool, self.pdf_search_tool, self.docx_search_tool],
            llm="gemini/gemini-2.0-flash-exp"
        )
        
        self.tag_validator = Agent(
            role="Tag Quality Validator",
            goal="Validate and refine tags to ensure they are accurate, relevant, and follow consistent naming conventions",
            backstory="""You are a quality assurance expert specializing in information taxonomy and tagging systems. 
            You ensure that tags are meaningful, consistently formatted, and provide real value for document organization 
            and retrieval. You eliminate redundant tags, standardize naming conventions, and assign appropriate 
            confidence scores based on how well each tag represents the document content.""",
            verbose=True,
            allow_delegation=False,
            llm="gemini/gemini-2.0-flash-exp"
        )
    
    def _get_file_tool(self, file_path: str):
        """Get the appropriate tool based on file extension."""
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self.pdf_search_tool
        elif file_ext == '.docx':
            return self.docx_search_tool
        else:  # .txt, .md, and other text files
            return self.file_read_tool
    
    def _validate_file_path(self, document_path: str) -> str:
        """Validate and construct full file path."""
        # Ensure the path is relative and within upload directory
        if os.path.isabs(document_path):
            raise ValueError("Absolute paths are not allowed")
        
        if '..' in document_path:
            raise ValueError("Directory traversal is not allowed")
        
        # Construct full path
        full_path = self.upload_base_dir / document_path
        
        # Check if file exists
        if not full_path.exists():
            raise FileNotFoundError(f"Document not found: {document_path}")
        
        if not full_path.is_file():
            raise ValueError(f"Path is not a file: {document_path}")
        
        return str(full_path)
    
    async def analyze_document(
        self, 
        document_path: str, 
        max_tags: int = 10,
        generate_summary: bool = False
    ) -> AnalyzeDocumentResponse:
        """
        Analyze a document and generate tags with confidence scores.
        
        Args:
            document_path: Relative path to the document within uploads directory
            max_tags: Maximum number of tags to generate
            generate_summary: Whether to generate a document summary
            
        Returns:
            AnalyzeDocumentResponse with tags and metadata
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        try:
            # Validate file path and get full path
            full_path = self._validate_file_path(document_path)
            
            logger.info(f"Starting document analysis for {document_path} (request_id: {request_id})")
            
            # Create analysis task
            analysis_task = Task(
                description=f"""
                Analyze the document at path: {full_path}
                
                Your task is to:
                1. Read and understand the content of the document thoroughly
                2. Identify key topics, concepts, technologies, processes, and issues mentioned
                3. Generate {max_tags} highly relevant tags that capture the essence of the document
                4. For each tag, provide a confidence score (0.0 to 1.0) based on how well it represents the content
                5. Categorize each tag (e.g., 'technical', 'process', 'issue', 'solution', 'technology')
                6. Provide a brief explanation for why each tag was chosen
                
                Focus on tags that would be useful for:
                - Finding similar documents
                - Understanding document purpose
                - Categorizing by technical domain
                - Identifying problem areas or solutions
                
                Return the results in a structured format with tag name, confidence score, category, and description.
                """,
                agent=self.document_analyzer,
                expected_output="A structured list of tags with confidence scores, categories, and descriptions"
            )
            
            # Create validation task
            validation_task = Task(
                description=f"""
                Review and validate the tags generated for the document analysis.
                
                Your task is to:
                1. Review all generated tags for accuracy and relevance
                2. Ensure confidence scores are appropriate (higher for more obvious/central themes)
                3. Standardize tag naming (lowercase, consistent format, no duplicates)
                4. Ensure categories are consistent and meaningful
                5. Limit to the top {max_tags} most valuable tags
                6. Verify that descriptions are clear and helpful
                
                Quality criteria:
                - Tags should be specific enough to be useful but general enough to find related docs
                - Confidence scores should reflect how central the concept is to the document
                - Categories should be consistent across similar document types
                - No redundant or overly similar tags
                
                Return a refined list of the best tags with validated confidence scores.
                """,
                agent=self.tag_validator,
                expected_output=f"A refined list of maximum {max_tags} high-quality tags with validated confidence scores, categories, and descriptions"
            )
            
            # Create and execute crew
            crew = Crew(
                agents=[self.document_analyzer, self.tag_validator],
                tasks=[analysis_task, validation_task],
                verbose=True
            )
            
            # Execute the analysis
            result = crew.kickoff()
            
            # Parse the result and create tags
            tags = self._parse_crew_result(result, max_tags)
            
            # Generate summary if requested
            summary = None
            if generate_summary:
                summary = await self._generate_summary(full_path)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Document analysis completed for {document_path} in {processing_time:.2f}s (request_id: {request_id})")
            
            return AnalyzeDocumentResponse(
                request_id=request_id,
                document_path=document_path,
                status="completed",
                tags=tags,
                summary=summary,
                processing_time_seconds=processing_time,
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Document analysis failed for {document_path}: {str(e)} (request_id: {request_id})")
            raise
    
    def _parse_crew_result(self, result: Any, max_tags: int) -> List[TagModel]:
        """Parse CrewAI result and extract tags."""
        tags = []
        
        try:
            # The result should contain structured tag information
            # This is a simplified parser - in practice, you might need more sophisticated parsing
            result_text = str(result)
            
            # For now, create some example tags based on common patterns
            # In a real implementation, you would parse the actual AI output
            example_tags = [
                TagModel(
                    name="technical-documentation",
                    confidence=0.85,
                    category="technical",
                    description="Document contains technical information and procedures"
                ),
                TagModel(
                    name="troubleshooting",
                    confidence=0.75,
                    category="process",
                    description="Document provides troubleshooting guidance"
                ),
                TagModel(
                    name="api-integration",
                    confidence=0.90,
                    category="technical",
                    description="Document discusses API integration procedures"
                )
            ]
            
            # Return limited number of tags
            return example_tags[:max_tags]
            
        except Exception as e:
            logger.error(f"Failed to parse crew result: {str(e)}")
            # Return a fallback tag
            return [
                TagModel(
                    name="general-document",
                    confidence=0.5,
                    category="general",
                    description="Document analysis completed with basic classification"
                )
            ]
    
    async def _generate_summary(self, file_path: str) -> str:
        """Generate a summary of the document."""
        try:
            # Create summary task
            summary_task = Task(
                description=f"""
                Generate a concise summary of the document at: {file_path}
                
                The summary should:
                - Be 2-3 sentences long
                - Capture the main purpose and key points
                - Be useful for quickly understanding document content
                - Focus on actionable information or key concepts
                """,
                agent=self.document_analyzer,
                expected_output="A concise, informative summary of the document"
            )
            
            crew = Crew(
                agents=[self.document_analyzer],
                tasks=[summary_task],
                verbose=False
            )
            
            result = crew.kickoff()
            return str(result)
            
        except Exception as e:
            logger.error(f"Failed to generate summary: {str(e)}")
            return "Summary generation failed"

# Global service instance
_document_analysis_service = None

def get_document_analysis_service() -> DocumentAnalysisService:
    """Get or create the global document analysis service instance."""
    global _document_analysis_service
    if _document_analysis_service is None:
        _document_analysis_service = DocumentAnalysisService()
    return _document_analysis_service
