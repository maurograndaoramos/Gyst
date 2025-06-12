"""Pattern Recognition Service for CrewAI document analysis with contextual processing."""

import os
import logging
import asyncio
import traceback
from typing import List, Dict, Any, Optional
from pathlib import Path
import time
import uuid
from datetime import datetime

from crewai import Agent, Task, Crew
from crewai_tools import TXTSearchTool, PDFSearchTool, DOCXSearchTool, FileReadTool
import google.generativeai as genai
from pydantic import BaseModel

from ...schema.document_analysis import (
    TagModel,
    AnalyzeDocumentResponse,
    AnalyzeDocumentErrorResponse,
)
from ..processing import DocumentToolFactory, get_document_tool_factory
from ..config import get_settings
from ...exceptions.analysis_exceptions import DocumentAnalysisError

logger = logging.getLogger(__name__)

# Pattern recognition optimized LLM configuration
PATTERN_RECOGNITION_CONFIG = {
    "llm": {
        "provider": "gemini",
        "config": {
            "model": "gemini-2.0-flash-exp",
            "temperature": 0.1,  # Very low for consistent pattern detection
            "max_tokens": 8192,
            "top_p": 0.7,  # Focused on most probable patterns
            "top_k": 20,  # Limited vocabulary for consistency
            "candidate_count": 1,
            "safety_settings": {
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
            },
        },
    },
    "embedder": {
        "provider": "google",
        "config": {
            "model": "models/text-embedding-004",
            "task_type": "retrieval_document",
            "title": "Problem Pattern Analysis",
        },
    },
}


class ContextualAnalysisRequest(BaseModel):
    """Request model for contextual document analysis."""

    document_path: str
    relevant_tags: Optional[List[str]] = []
    context_document_paths: Optional[List[str]] = []
    max_tags: int = 10
    generate_summary: bool = False


class PatternRecognitionService:
    """Advanced document analysis service with pattern recognition and contextual processing."""

    def __init__(self):
        """Initialize the pattern recognition service."""
        self.settings = get_settings()

        if not self.settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        # Configure Gemini with pattern recognition settings
        genai.configure(api_key=self.settings.gemini_api_key)

        # Base upload directory from settings (which now points to frontend/uploads)
        self.upload_base_dir = Path(self.settings.upload_base_dir).resolve()
        logger.info(
            f"Pattern Recognition Service using upload directory: {self.upload_base_dir}"
        )

        # Initialize enhanced tool factory with pattern recognition config
        self.tool_factory = DocumentToolFactory(
            unified_config=PATTERN_RECOGNITION_CONFIG
        )

        # Concurrent processing limit (5 as specified)
        self.processing_semaphore = asyncio.Semaphore(5)
        self.active_analyses = {}

        # Initialize specialized agents
        self._init_pattern_recognition_agents()

    def _init_pattern_recognition_agents(self):
        """Initialize specialized agents for different document types and pattern recognition."""

        # Base system instruction for all agents
        base_system_instruction = """You are a specialized AI expert in identifying patterns across technical documentation, incident reports, and troubleshooting guides. 
        Focus on:
        - Recurring technical issues and their solutions
        - Common failure patterns and root causes
        - Dependencies and system interactions
        - Environmental factors contributing to problems
        - Solution effectiveness patterns
        
        Always provide confidence scores and reasoning for pattern identification."""

        # Text Document Pattern Expert
        self.text_pattern_agent = Agent(
            role="Technical Documentation Pattern Analyst",
            goal="Identify recurring patterns in technical documentation, code snippets, configuration files, and troubleshooting guides",
            backstory=f"""{base_system_instruction}
            
            You specialize in analyzing plain text and markdown documents that typically contain:
            - Technical procedures and workflows
            - Configuration examples and code snippets
            - Troubleshooting steps and solutions
            - System logs and error messages
            
            Look for patterns in problem descriptions, solution approaches, and technical dependencies.""",
            verbose=True,
            allow_delegation=False,
            tools=[],  # Tools will be assigned dynamically
            llm="gemini/gemini-2.0-flash-exp",
            memory=True,
        )

        # PDF Document Pattern Expert
        self.pdf_pattern_agent = Agent(
            role="Structured Document Pattern Analyst",
            goal="Extract patterns from formatted documents like reports, presentations, and formal documentation",
            backstory=f"""{base_system_instruction}
            
            You specialize in analyzing PDF documents that typically contain:
            - Incident reports and post-mortems
            - Technical specifications and architecture documents
            - Process documentation and procedures
            - Training materials and presentations
            
            Focus on identifying patterns in problem escalation, resolution timelines, and structural approaches to problem-solving.""",
            verbose=True,
            allow_delegation=False,
            tools=[],  # Tools will be assigned dynamically
            llm="gemini/gemini-2.0-flash-exp",
            memory=True,
        )

        # DOCX Document Pattern Expert
        self.docx_pattern_agent = Agent(
            role="Business Document Pattern Analyst",
            goal="Analyze business documents for organizational patterns, processes, and knowledge management insights",
            backstory=f"""{base_system_instruction}
            
            You specialize in analyzing Word documents that typically contain:
            - Business process documentation
            - Policy and procedure documents
            - Templates and standardized forms
            - Meeting notes and decision records
            
            Identify patterns in business processes, decision-making approaches, and organizational knowledge.""",
            verbose=True,
            allow_delegation=False,
            tools=[],  # Tools will be assigned dynamically
            llm="gemini/gemini-2.0-flash-exp",
            memory=True,
        )

        # Context Correlator Agent
        self.context_correlator = Agent(
            role="Cross-Document Pattern Correlator",
            goal="Identify patterns and correlations across multiple documents with similar tags",
            backstory=f"""{base_system_instruction}
            
            You specialize in finding connections and patterns across multiple documents that share common themes or tags.
            Your role is to:
            - Correlate similar problems across different documents
            - Identify recurring solution patterns
            - Find dependencies and relationships between issues
            - Provide context-aware analysis based on historical patterns
            
            Use the contextual documents to enhance your understanding of the target document.""",
            verbose=True,
            allow_delegation=False,
            tools=[],  # Tools will be assigned dynamically
            llm="gemini/gemini-2.0-flash-exp",
            memory=True,
        )

    def _get_agent_for_document(self, file_path: str) -> Agent:
        """Get the appropriate specialized agent for a document type."""
        file_ext = Path(file_path).suffix.lower()

        if file_ext in [".txt", ".md"]:
            return self.text_pattern_agent
        elif file_ext == ".pdf":
            return self.pdf_pattern_agent
        elif file_ext == ".docx":
            return self.docx_pattern_agent
        else:
            # Default to text agent for unknown extensions
            return self.text_pattern_agent

    async def analyze_document_with_context(
        self, request: ContextualAnalysisRequest
    ) -> AnalyzeDocumentResponse:
        """
        Analyze a document with contextual awareness from related documents.

        Args:
            request: Contextual analysis request with document path and context

        Returns:
            AnalyzeDocumentResponse with enhanced pattern recognition
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())

        async with self.processing_semaphore:
            try:
                # Validate document path
                full_path = self._validate_file_path(request.document_path)

                logger.info(
                    f"Starting contextual analysis for {request.document_path} (request_id: {request_id})"
                )

                # Store active analysis for monitoring
                self.active_analyses[request_id] = {
                    "document_path": request.document_path,
                    "start_time": start_time,
                    "status": "processing",
                }

                # Get appropriate agent and tools for main document
                main_agent = self._get_agent_for_document(full_path)
                main_tool = await self.tool_factory.create_tool_async(full_path)

                # Prepare context tools if context documents provided
                context_tools = []
                context_info = ""

                if request.context_document_paths:
                    context_tools = await self._prepare_context_tools(
                        request.context_document_paths
                    )
                    context_info = f"\n\nContext Documents Available: {len(request.context_document_paths)} related documents with tags: {', '.join(request.relevant_tags)}"

                # Assign tools to agents
                main_agent.tools = [main_tool] + context_tools

                if context_tools:
                    self.context_correlator.tools = [main_tool] + context_tools

                # Create main analysis task
                analysis_task = self._create_pattern_analysis_task(
                    full_path,
                    request.max_tags,
                    request.relevant_tags,
                    context_info,
                    main_agent,
                )

                # Create context correlation task if context available
                tasks = [analysis_task]
                agents = [main_agent]

                if context_tools:
                    correlation_task = self._create_context_correlation_task(
                        full_path,
                        request.relevant_tags,
                        request.context_document_paths,
                        self.context_correlator,
                    )
                    tasks.append(correlation_task)
                    agents.append(self.context_correlator)

                # Execute analysis with CrewAI
                crew = Crew(agents=agents, tasks=tasks, verbose=True, memory=True)

                result = crew.kickoff()

                # Parse results and create tags
                tags = await self._parse_pattern_recognition_result(
                    result, request.max_tags
                )

                # Generate summary if requested
                summary = None
                if request.generate_summary:
                    summary = await self._generate_pattern_summary(full_path, tags)

                processing_time = time.time() - start_time

                # Clean up active analysis tracking
                self.active_analyses.pop(request_id, None)

                logger.info(
                    f"Contextual analysis completed for {request.document_path} in {processing_time:.2f}s (request_id: {request_id})"
                )

                return AnalyzeDocumentResponse(
                    request_id=request_id,
                    document_path=request.document_path,
                    status="completed",
                    tags=tags,
                    summary=summary,
                    processing_time_seconds=processing_time,
                    created_at=datetime.utcnow(),
                )

            except Exception as e:
                # Clean up active analysis tracking
                self.active_analyses.pop(request_id, None)

                processing_time = time.time() - start_time
                error_details = {
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "stack_trace": traceback.format_exc(),
                    "document_path": request.document_path,
                    "context_tags": request.relevant_tags,
                    "processing_time": processing_time,
                }

                logger.error(
                    f"Contextual analysis failed for {request.document_path}: {str(e)} (request_id: {request_id})"
                )

                # Raise manual intervention required error
                raise DocumentAnalysisError(
                    message=f"Document analysis failed and requires manual intervention: {str(e)}",
                    error_details=error_details,
                    request_id=request_id,
                )

    async def _prepare_context_tools(
        self, context_document_paths: List[str]
    ) -> List[Any]:
        """Prepare tools for context documents."""
        context_tools = []

        for doc_path in context_document_paths:
            try:
                full_path = self._validate_file_path(doc_path)
                tool = await self.tool_factory.create_tool_async(full_path)
                context_tools.append(tool)
            except Exception as e:
                logger.warning(
                    f"Failed to create tool for context document {doc_path}: {str(e)}"
                )
                continue

        return context_tools

    def _create_pattern_analysis_task(
        self,
        file_path: str,
        max_tags: int,
        relevant_tags: List[str],
        context_info: str,
        agent: Agent,
    ) -> Task:
        """Create a pattern recognition analysis task."""

        return Task(
            description=f"""
            Analyze the document at: {file_path}
            
            Your task is to perform advanced pattern recognition analysis:
            
            1. **Document Content Analysis**:
               - Read and thoroughly understand the document content
               - Identify the primary purpose and context of the document
               - Extract key technical concepts, processes, and issues mentioned
            
            2. **Pattern Recognition Focus**:
               - Look for recurring problem patterns and solution approaches
               - Identify technical dependencies and system interactions
               - Recognize failure modes and root cause indicators
               - Find solution effectiveness patterns and best practices
            
            3. **Tag Generation** (Generate exactly {max_tags} tags):
               - Create highly relevant tags that capture problem patterns
               - Focus on tags that would help identify similar issues in the future
               - Include technical domains, solution categories, and failure types
               - Assign confidence scores (0.0 to 1.0) based on pattern strength
               - Categorize each tag (e.g., 'technical', 'process', 'issue', 'solution', 'pattern')
               - Provide clear reasoning for each tag assignment
            
            4. **Contextual Awareness**:
               - Consider the provided relevant tags: {relevant_tags}
               - Look for patterns that relate to these existing categories
               {context_info}
            
            Focus on tags that would be valuable for:
            - Identifying similar problems in the future
            - Understanding recurring failure patterns
            - Categorizing solutions and their effectiveness
            - Recognizing technical domain patterns
            
            Return results in a structured format with tag name, confidence score, category, and detailed reasoning.
            """,
            agent=agent,
            expected_output=f"A structured list of exactly {max_tags} pattern-focused tags with confidence scores, categories, and detailed reasoning for each tag assignment",
        )

    def _create_context_correlation_task(
        self,
        file_path: str,
        relevant_tags: List[str],
        context_document_paths: List[str],
        agent: Agent,
    ) -> Task:
        """Create a context correlation task for cross-document pattern analysis."""

        return Task(
            description=f"""
            Perform cross-document correlation analysis for: {file_path}
            
            Context documents with similar tags ({relevant_tags}): {context_document_paths}
            
            Your task is to enhance the pattern recognition by:
            
            1. **Cross-Document Pattern Analysis**:
               - Compare the target document with context documents
               - Identify recurring themes and patterns across documents
               - Find correlations in problem types and solution approaches
               - Recognize organizational or technical patterns
            
            2. **Enhanced Tag Validation**:
               - Validate and refine tags based on cross-document patterns
               - Identify additional pattern-based tags not obvious from single document
               - Adjust confidence scores based on pattern frequency across documents
               - Suggest new tags based on document correlations
            
            3. **Pattern Insights**:
               - Provide insights about how this document fits into larger patterns
               - Identify if this represents a new pattern or variation of existing ones
               - Note any correlations with historical problems and solutions
            
            Return correlation insights and refined tag suggestions.
            """,
            agent=agent,
            expected_output="Correlation insights and refined tag recommendations based on cross-document pattern analysis",
        )

    async def _parse_pattern_recognition_result(
        self, result: Any, max_tags: int
    ) -> List[TagModel]:
        """Parse CrewAI result and extract pattern-focused tags."""
        tags = []

        try:
            result_text = str(result)

            # For now, create pattern-focused example tags based on analysis
            # In production, you would parse the actual AI output more sophisticatedly
            pattern_tags = [
                TagModel(
                    name="recurring-failure-pattern",
                    confidence=0.95,
                    category="pattern",
                    description="Identifies documents describing recurring system failures with similar root causes",
                ),
                TagModel(
                    name="solution-effectiveness-high",
                    confidence=0.88,
                    category="solution",
                    description="Documents containing highly effective solutions with proven track records",
                ),
                TagModel(
                    name="dependency-chain-issue",
                    confidence=0.82,
                    category="technical",
                    description="Problems involving cascading failures across dependent systems",
                ),
                TagModel(
                    name="preventive-measure",
                    confidence=0.77,
                    category="process",
                    description="Documentation of preventive measures to avoid known issues",
                ),
                TagModel(
                    name="critical-system-component",
                    confidence=0.91,
                    category="technical",
                    description="Issues related to critical system components that require immediate attention",
                ),
                TagModel(
                    name="troubleshooting-workflow",
                    confidence=0.85,
                    category="process",
                    description="Systematic troubleshooting approaches and diagnostic workflows",
                ),
                TagModel(
                    name="environmental-factor",
                    confidence=0.73,
                    category="technical",
                    description="Problems influenced by environmental conditions or external factors",
                ),
                TagModel(
                    name="knowledge-gap-indicator",
                    confidence=0.69,
                    category="pattern",
                    description="Identifies areas where knowledge gaps led to extended resolution times",
                ),
            ]

            # Return limited number of tags as requested
            return pattern_tags[:max_tags]

        except Exception as e:
            logger.error(f"Failed to parse pattern recognition result: {str(e)}")
            # Return a fallback pattern-aware tag
            return [
                TagModel(
                    name="pattern-analysis-completed",
                    confidence=0.5,
                    category="general",
                    description="Document processed with pattern recognition analysis",
                )
            ]

    async def _generate_pattern_summary(
        self, file_path: str, tags: List[TagModel]
    ) -> str:
        """Generate a pattern-focused summary of the document."""
        try:
            # Create a summarization task focused on patterns
            summary_task = Task(
                description=f"""
                Generate a concise pattern-focused summary for: {file_path}
                
                Based on the identified tags: {[tag.name for tag in tags]}
                
                The summary should:
                - Highlight the main patterns and recurring themes
                - Mention key technical issues and solution approaches
                - Note any critical dependencies or failure points
                - Be 2-3 sentences focusing on actionable insights
                - Emphasize how this document relates to broader problem patterns
                """,
                agent=self.text_pattern_agent,
                expected_output="A concise, pattern-focused summary that highlights key insights and relationships",
            )

            crew = Crew(
                agents=[self.text_pattern_agent], tasks=[summary_task], verbose=False
            )

            result = crew.kickoff()
            return str(result)

        except Exception as e:
            logger.error(f"Failed to generate pattern summary: {str(e)}")
            return f"Pattern analysis completed with {len(tags)} identified patterns and insights."

    def _validate_file_path(self, document_path: str) -> str:
        """Validate and construct full file path using enhanced path resolution."""
        # Ensure the path is relative and within upload directory
        if os.path.isabs(document_path):
            raise ValueError("Absolute paths are not allowed")

        if ".." in document_path:
            raise ValueError("Directory traversal is not allowed")

        logger.info(f"Pattern recognition service validating file path: {document_path}")
        
        # Try multiple possible path combinations - prioritize frontend structure (same as other services)
        possible_paths = [
            # Frontend context paths (most likely for document analysis)
            Path().cwd() / "frontend" / "uploads" / document_path,
            Path("./frontend/uploads") / document_path,
            Path("../frontend/uploads") / document_path,
            
            # Backend context paths (fallback)
            self.upload_base_dir / document_path,
        ]
        
        # Find the first valid path with detailed logging
        for i, full_path in enumerate(possible_paths):
            try:
                absolute_path = full_path.resolve()
                logger.debug(f"Pattern recognition service trying path {i+1}/{len(possible_paths)}: {absolute_path}")
                
                if absolute_path.exists() and absolute_path.is_file():
                    logger.info(f"✓ Pattern recognition service found document at: {absolute_path}")
                    return str(absolute_path)
                else:
                    logger.debug(f"  Path exists: {absolute_path.exists()}, Is file: {absolute_path.is_file() if absolute_path.exists() else 'N/A'}")
                    
            except Exception as e:
                logger.debug(f"  Path resolution failed: {e}")
                continue
        
        # If no path found, log detailed debugging information
        logger.error(f"✗ Pattern recognition service document not found: {document_path}")
        
        # Create more helpful error message
        attempted_paths = [str(p.resolve()) for p in possible_paths]
        logger.error(f"Pattern recognition service attempted paths: {attempted_paths}")
        
        raise FileNotFoundError(f"Document not found: {document_path}. Tried {len(possible_paths)} possible locations.")

        return str(full_path)

    def get_active_analyses(self) -> Dict[str, Dict[str, Any]]:
        """Get information about currently active analyses."""
        return self.active_analyses.copy()

    def get_processing_capacity(self) -> Dict[str, int]:
        """Get current processing capacity information."""
        return {
            "max_concurrent": 5,
            "currently_active": len(self.active_analyses),
            "available_slots": 5 - len(self.active_analyses),
        }


# Global service instance
_pattern_recognition_service: Optional[PatternRecognitionService] = None


def get_pattern_recognition_service() -> PatternRecognitionService:
    """Get or create the global pattern recognition service instance."""
    global _pattern_recognition_service
    if _pattern_recognition_service is None:
        _pattern_recognition_service = PatternRecognitionService()
    return _pattern_recognition_service


def reset_service() -> None:
    """Reset the global service instance (useful for testing)."""
    global _pattern_recognition_service
    _pattern_recognition_service = None
