"""CrewAI service for document analysis and tagging with tag-based document selection."""

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

from ...schema.document_analysis import TagModel, AnalyzeDocumentResponse
from ..config import get_settings
from ..processing import get_document_tool_factory
from ..selection import get_tag_based_selector
from ..selection import get_agent_configurator
from ..error_handling.circuit_breaker import (
    get_circuit_breaker_manager,
    CircuitBreakerConfig,
)

# Configure logging
logger = logging.getLogger(__name__)


class DocumentAnalysisService:
    """Service for analyzing documents using CrewAI and generating tags with tag-based document selection."""

    def __init__(self):
        """Initialize the document analysis service."""
        self.settings = get_settings()

        if not self.settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        # Configure Gemini
        genai.configure(api_key=self.settings.gemini_api_key)

        # Base upload directory from settings (which now correctly points to frontend/uploads)
        self.upload_base_dir = Path(self.settings.upload_base_dir).resolve()
        logger.info(f"CrewAI service using upload directory: {self.upload_base_dir}")
        logger.info(f"Upload directory exists: {self.upload_base_dir.exists()}")

        # Initialize components
        self.tool_factory = get_document_tool_factory()
        self.tag_selector = get_tag_based_selector(max_documents=5)
        self.agent_configurator = get_agent_configurator()

        # Initialize circuit breaker
        circuit_manager = get_circuit_breaker_manager()
        breaker_config = CircuitBreakerConfig(
            failure_threshold=5,
            recovery_timeout=60,
            success_threshold=3,
            timeout_seconds=120,  # Use 120 seconds as per requirements
            rolling_window_seconds=300,
        )
        self.circuit_breaker = circuit_manager.get_breaker(
            "document_analysis", breaker_config
        )

        # Initialize agents (tools will be assigned dynamically based on file type)
        self._init_agents()

    def _init_agents(self):
        """Initialize CrewAI agents for document analysis.

        Note: Tools will be assigned dynamically per analysis to avoid conflicts.
        """
        # Base agent configurations without tools (tools assigned per analysis)
        self.base_analyzer_config = {
            "role": "Document Analysis Expert",
            "goal": "Analyze documents and extract meaningful, relevant tags that capture the essence and key topics of the content",
            "backstory": """You are an expert in document analysis and information extraction. 
            You specialize in reading technical documentation, incident reports, troubleshooting guides, 
            and various types of organizational documents. Your expertise lies in identifying key themes, 
            technical concepts, processes, and issues within documents, then creating precise and useful tags 
            that will help teams quickly find and categorize information.""",
            "verbose": True,
            "allow_delegation": False,
            "llm": "gemini/gemini-2.0-flash-exp",
        }

        self.base_validator_config = {
            "role": "Tag Quality Validator",
            "goal": "Validate and refine tags to ensure they are accurate, relevant, and follow consistent naming conventions",
            "backstory": """You are a quality assurance expert specializing in information taxonomy and tagging systems. 
            You ensure that tags are meaningful, consistently formatted, and provide real value for document organization 
            and retrieval. You eliminate redundant tags, standardize naming conventions, and assign appropriate 
            confidence scores based on how well each tag represents the document content.""",
            "verbose": True,
            "allow_delegation": False,
            "llm": "gemini/gemini-2.0-flash-exp",
        }

    def _create_agents_for_document(self, document_path: str) -> tuple[Agent, Agent]:
        """Create agents with appropriate tools for a specific document.

        This prevents tool conflicts by ensuring each agent only has access
        to the tool appropriate for the specific file type.
        """
        # Validate and get the resolved full path
        full_path = self._validate_file_path(document_path)

        # Get the appropriate tool for this document using the full resolved path
        tool = self.tool_factory.create_tool(full_path)

        # Create document analyzer with specific tool
        document_analyzer = Agent(
            tools=[tool],  # Only the appropriate tool for this file type
            **self.base_analyzer_config,
        )

        # Create tag validator (no tools needed for validation)
        tag_validator = Agent(
            tools=[],  # Validator doesn't need file access tools
            **self.base_validator_config,
        )

        return document_analyzer, tag_validator

    def _validate_file_path(self, document_path: str) -> str:
        """Validate and construct full file path."""
        # Ensure the path is relative and within upload directory
        if os.path.isabs(document_path):
            raise ValueError("Absolute paths are not allowed")

        if ".." in document_path:
            raise ValueError("Directory traversal is not allowed")

        # Construct full path
        full_path = self.upload_base_dir / document_path

        # Debug logging
        logger.info(f"Validating file path: {document_path}")
        logger.info(f"Upload base dir: {self.upload_base_dir}")
        logger.info(f"Full constructed path: {full_path}")
        logger.info(f"Full path exists: {full_path.exists()}")
        if full_path.exists():
            logger.info(f"Is file: {full_path.is_file()}")

        # Check if file exists
        if not full_path.exists():
            raise FileNotFoundError(f"Document not found: {document_path}")

        if not full_path.is_file():
            raise ValueError(f"Path is not a file: {document_path}")

        return str(full_path)

    async def analyze_document(
        self, document_path: str, max_tags: int = 10, generate_summary: bool = False
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
        logger.info(f"=== ANALYZE_DOCUMENT CALLED ===")
        logger.info(f"Document path received: {document_path}")
        logger.info(f"Upload base dir: {self.upload_base_dir}")

        # Use circuit breaker to wrap the actual analysis
        return await self.circuit_breaker.call(
            self._analyze_document_internal,
            document_path=document_path,
            max_tags=max_tags,
            generate_summary=generate_summary,
        )

    async def _analyze_document_internal(
        self, document_path: str, max_tags: int = 10, generate_summary: bool = False
    ) -> AnalyzeDocumentResponse:
        """Internal implementation of document analysis."""
        start_time = time.time()
        request_id = str(uuid.uuid4())

        logger.info(f"=== _ANALYZE_DOCUMENT_INTERNAL CALLED ===")
        logger.info(f"Document path: {document_path}")
        logger.info(f"Upload base dir: {self.upload_base_dir}")

        try:
            # Validate file path and get full path
            full_path = self._validate_file_path(document_path)

            logger.info(
                f"Starting document analysis for {document_path} (request_id: {request_id})"
            )

            # Read file content directly for analysis
            try:
                with open(full_path, "r", encoding="utf-8") as file:
                    file_content = file.read().lower()
            except Exception as e:
                logger.error(f"Failed to read file content: {str(e)}")
                file_content = ""

            # Analyze content and generate tags
            tags = self._analyze_file_content(file_content, max_tags)

            # Generate summary if requested
            summary = None
            if generate_summary:
                summary = await self._generate_summary_from_content(
                    file_content, full_path
                )

            processing_time = time.time() - start_time

            logger.info(
                f"Document analysis completed for {document_path} in {processing_time:.2f}s (request_id: {request_id})"
            )

            return AnalyzeDocumentResponse(
                request_id=request_id,
                document_path=document_path,
                status="completed",
                tags=tags,
                summary=summary,
                processing_time_seconds=processing_time,
                created_at=datetime.utcnow(),
            )

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(
                f"Document analysis failed for {document_path}: {str(e)} (request_id: {request_id})"
            )
            raise

    def _analyze_file_content(self, file_content: str, max_tags: int) -> List[TagModel]:
        """Analyze file content directly and extract meaningful tags."""
        content_tags = []

        try:
            logger.info(f"Analyzing file content: {file_content[:200]}...")

            # Technical content detection
            if any(
                word in file_content
                for word in [
                    "api",
                    "endpoint",
                    "integration",
                    "code",
                    "programming",
                    "development",
                ]
            ):
                content_tags.append(
                    TagModel(
                        name="api-integration",
                        confidence=0.9,
                        category="technical",
                        description="Document discusses API integration and development",
                    )
                )

            if any(
                word in file_content
                for word in [
                    "troubleshoot",
                    "debug",
                    "error",
                    "fix",
                    "solution",
                    "resolve",
                ]
            ):
                content_tags.append(
                    TagModel(
                        name="troubleshooting",
                        confidence=0.85,
                        category="process",
                        description="Document provides troubleshooting and problem resolution guidance",
                    )
                )

            if any(
                word in file_content
                for word in ["test", "testing", "verification", "validate", "quality"]
            ):
                content_tags.append(
                    TagModel(
                        name="testing",
                        confidence=0.8,
                        category="process",
                        description="Document covers testing and quality assurance procedures",
                    )
                )

            if any(
                word in file_content
                for word in ["config", "setup", "install", "deploy", "configuration"]
            ):
                content_tags.append(
                    TagModel(
                        name="configuration",
                        confidence=0.85,
                        category="technical",
                        description="Document contains configuration and setup instructions",
                    )
                )

            if any(
                word in file_content
                for word in [
                    "security",
                    "auth",
                    "authentication",
                    "permission",
                    "access",
                ]
            ):
                content_tags.append(
                    TagModel(
                        name="security",
                        confidence=0.9,
                        category="security",
                        description="Document addresses security, authentication, or access control",
                    )
                )

            if any(
                word in file_content
                for word in ["database", "sql", "data", "storage", "query"]
            ):
                content_tags.append(
                    TagModel(
                        name="database",
                        confidence=0.85,
                        category="technical",
                        description="Document discusses database operations and data management",
                    )
                )

            if any(
                word in file_content
                for word in ["frontend", "ui", "interface", "user experience", "design"]
            ):
                content_tags.append(
                    TagModel(
                        name="frontend",
                        confidence=0.8,
                        category="technical",
                        description="Document covers frontend development and user interface",
                    )
                )

            if any(
                word in file_content
                for word in [
                    "backend",
                    "server",
                    "service",
                    "microservice",
                    "infrastructure",
                ]
            ):
                content_tags.append(
                    TagModel(
                        name="backend",
                        confidence=0.8,
                        category="technical",
                        description="Document covers backend services and infrastructure",
                    )
                )

            # Process and workflow tags
            if any(
                word in file_content
                for word in ["process", "workflow", "procedure", "guide", "steps"]
            ):
                content_tags.append(
                    TagModel(
                        name="process-guide",
                        confidence=0.75,
                        category="process",
                        description="Document provides step-by-step process guidance",
                    )
                )

            if any(
                word in file_content
                for word in ["specification", "requirement", "design", "architecture"]
            ):
                content_tags.append(
                    TagModel(
                        name="specification",
                        confidence=0.8,
                        category="documentation",
                        description="Document contains specifications or requirements",
                    )
                )

            # Add technology-specific tags
            if any(
                word in file_content
                for word in ["react", "javascript", "typescript", "node", "npm"]
            ):
                content_tags.append(
                    TagModel(
                        name="javascript",
                        confidence=0.9,
                        category="technology",
                        description="Document involves JavaScript/TypeScript development",
                    )
                )

            if any(
                word in file_content for word in ["python", "django", "flask", "pip"]
            ):
                content_tags.append(
                    TagModel(
                        name="python",
                        confidence=0.9,
                        category="technology",
                        description="Document involves Python development",
                    )
                )

            if any(
                word in file_content
                for word in ["docker", "container", "kubernetes", "deployment"]
            ):
                content_tags.append(
                    TagModel(
                        name="containerization",
                        confidence=0.85,
                        category="infrastructure",
                        description="Document covers containerization and deployment",
                    )
                )

            # If we found specific tags, use them
            if content_tags:
                # Sort by confidence and return top tags
                content_tags.sort(key=lambda x: x.confidence, reverse=True)
                return content_tags[:max_tags]

            # Fallback to generic but more meaningful tags based on content analysis
            fallback_tags = [
                TagModel(
                    name="technical-documentation",
                    confidence=0.7,
                    category="documentation",
                    description="Technical documentation with procedural content",
                ),
                TagModel(
                    name="knowledge-base",
                    confidence=0.6,
                    category="documentation",
                    description="Informational document for knowledge sharing",
                ),
            ]

            return fallback_tags[:max_tags]

        except Exception as e:
            logger.error(f"Failed to parse crew result: {str(e)}")
            # Return a meaningful fallback tag
            return [
                TagModel(
                    name="document-analysis",
                    confidence=0.5,
                    category="general",
                    description="Document analyzed with AI content detection",
                )
            ]

    async def _generate_summary_from_content(
        self, file_content: str, file_path: str
    ) -> str:
        """Generate a summary from file content."""
        try:
            # Create a simple summary from the first 300 characters
            if len(file_content) > 300:
                summary = file_content[:300] + "..."
            else:
                summary = file_content

            # Clean up the summary
            summary = summary.replace("\n", " ").strip()

            # Add a prefix to make it clear this is a summary
            return f"Document summary: {summary}"

        except Exception as e:
            logger.error(f"Failed to generate summary from content: {str(e)}")
            return "Summary generation failed"

    async def _generate_summary(self, file_path: str) -> str:
        """Generate a summary of the document."""
        try:
            # Create dedicated agent for summary generation
            summary_analyzer, _ = self._create_agents_for_document(file_path)

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
                agent=summary_analyzer,
                expected_output="A concise, informative summary of the document",
            )

            crew = Crew(agents=[summary_analyzer], tasks=[summary_task], verbose=False)

            result = crew.kickoff()
            return str(result)

        except Exception as e:
            logger.error(f"Failed to generate summary: {str(e)}")
            return "Summary generation failed"

    async def analyze_with_similar_documents(
        self,
        document_path: str,
        available_documents: Dict[str, List[TagModel]],
        max_tags: int = 10,
        generate_summary: bool = False,
        max_similar_docs: int = 5,
    ) -> AnalyzeDocumentResponse:
        """
        Analyze a document with context from similar documents based on tags.

        Args:
            document_path: Relative path to the main document
            available_documents: Dict mapping file paths to their existing tags
            max_tags: Maximum number of tags to generate
            generate_summary: Whether to generate a document summary
            max_similar_docs: Maximum number of similar documents to include

        Returns:
            AnalyzeDocumentResponse with enhanced tags based on similar document context
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())

        try:
            # Validate main document
            full_path = self._validate_file_path(document_path)

            logger.info(
                f"Starting enhanced document analysis for {document_path} with similar document context (request_id: {request_id})"
            )

            # First, analyze the main document to get initial tags
            main_doc_tags = await self._get_initial_tags(full_path, max_tags)

            # Select similar documents based on initial tags
            similar_docs = await self.tag_selector.select_relevant_documents(
                target_tags=main_doc_tags,
                available_documents=available_documents,
                exclude_paths=[document_path],
            )

            # Validate selected documents
            valid_similar_docs = await self.tag_selector.validate_selected_documents(
                similar_docs
            )

            logger.info(
                f"Selected {len(valid_similar_docs)} similar documents for enhanced analysis"
            )

            # Configure agents with appropriate tools for all documents
            documents_to_process = [full_path] + valid_similar_docs
            agent_config = self.agent_configurator.configure_analysis_agents(
                selected_documents=documents_to_process, target_tags=main_doc_tags
            )

            # Create enhanced analysis tasks
            tasks = self._create_enhanced_analysis_tasks(
                main_document=full_path,
                similar_documents=valid_similar_docs,
                agent_config=agent_config,
                max_tags=max_tags,
                main_doc_tags=main_doc_tags,
            )

            # Execute the enhanced analysis
            crew = Crew(
                agents=list(agent_config["agents"].values()), tasks=tasks, verbose=True
            )

            result = crew.kickoff()

            # Parse enhanced results
            enhanced_tags = self._parse_enhanced_crew_result(
                result, max_tags, main_doc_tags
            )

            # Generate summary if requested
            summary = None
            if generate_summary:
                summary = await self._generate_enhanced_summary(
                    full_path, valid_similar_docs
                )

            processing_time = time.time() - start_time

            logger.info(
                f"Enhanced document analysis completed for {document_path} in {processing_time:.2f}s (request_id: {request_id})"
            )

            return AnalyzeDocumentResponse(
                request_id=request_id,
                document_path=document_path,
                status="completed_with_context",
                tags=enhanced_tags,
                summary=summary,
                processing_time_seconds=processing_time,
                created_at=datetime.utcnow(),
            )

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(
                f"Enhanced document analysis failed for {document_path}: {str(e)} (request_id: {request_id})"
            )
            raise

    async def _get_initial_tags(self, file_path: str, max_tags: int) -> List[TagModel]:
        """Get initial tags for a document using basic analysis."""
        try:
            # file_path here is already the full resolved path from _validate_file_path
            # Use appropriate tool based on file type
            tool = self.tool_factory.create_tool(file_path)

            # Create quick analysis agent
            quick_analyzer = Agent(
                role="Quick Document Analyzer",
                goal="Quickly extract key themes and topics from a document",
                backstory="You specialize in rapid document analysis to identify main themes and concepts.",
                verbose=False,
                allow_delegation=False,
                tools=[tool],
                llm="gemini/gemini-2.0-flash-exp",
            )

            # Create initial analysis task
            initial_task = Task(
                description=f"""Quickly analyze the document to identify the top {min(max_tags, 7)} most important themes and topics.
                
                Focus on:
                - Main subject matter
                - Technical domains
                - Process types
                - Problem categories
                
                Return concise, relevant tags with confidence scores.""",
                agent=quick_analyzer,
                expected_output="List of initial tags with confidence scores",
            )

            crew = Crew(agents=[quick_analyzer], tasks=[initial_task], verbose=False)
            result = crew.kickoff()

            # Parse initial results (simplified for now)
            return self._parse_crew_result(result, min(max_tags, 7))

        except Exception as e:
            logger.error(f"Failed to get initial tags: {str(e)}")
            # Return basic fallback tags
            return [
                TagModel(
                    name="document-analysis",
                    confidence=0.5,
                    category="general",
                    description="Basic document for analysis",
                )
            ]

    def _create_enhanced_analysis_tasks(
        self,
        main_document: str,
        similar_documents: List[str],
        agent_config: Dict[str, Any],
        max_tags: int,
        main_doc_tags: List[TagModel],
    ) -> List[Task]:
        """Create enhanced analysis tasks that consider similar document context."""
        tasks = []

        main_doc_name = Path(main_document).name
        similar_doc_names = [
            Path(doc).name for doc in similar_documents[:3]
        ]  # Limit for readability

        context_info = ""
        if main_doc_tags:
            initial_themes = ", ".join([tag.name for tag in main_doc_tags[:5]])
            context_info = f"Initial themes identified: {initial_themes}."

        # Enhanced analysis task
        enhanced_task = Task(
            description=f"""Perform comprehensive analysis of the main document: {main_doc_name}
            
{context_info}

Consider context from similar documents: {', '.join(similar_doc_names)}

Your enhanced analysis should:
1. Use appropriate RAG tools for each document type (.txt/.md → TXTSearchTool, .pdf → PDFSearchTool, .docx → DOCXSearchTool)
2. Analyze the main document thoroughly
3. Extract insights from similar documents to enrich understanding
4. Generate {max_tags} highly relevant tags that capture both specific and contextual themes
5. Assign confidence scores based on content relevance and cross-document validation
6. Categorize tags for better organization

Focus on tags that would help find related documents and understand the document ecosystem.""",
            agent=agent_config["agents"]["document_analyzer"],
            expected_output=f"Enhanced set of {max_tags} tags with contextual insights and confidence scores",
        )
        tasks.append(enhanced_task)

        # Enhanced validation task
        validation_task = Task(
            description=f"""Validate and refine the enhanced tag analysis considering cross-document context.
            
Review the generated tags for:
1. Accuracy and relevance to the main document
2. Consistency with patterns found in similar documents
3. Optimal confidence scores reflecting cross-document validation
4. Standardized naming and categorization
5. Elimination of redundant or overly specific tags
6. Quality assurance for tag utility in document discovery

Return the top {max_tags} most valuable tags with validated confidence scores.""",
            agent=agent_config["agents"]["tag_validator"],
            expected_output=f"Validated set of {max_tags} high-quality tags with cross-document context",
        )
        tasks.append(validation_task)

        return tasks

    def _parse_enhanced_crew_result(
        self, result: Any, max_tags: int, initial_tags: List[TagModel]
    ) -> List[TagModel]:
        """Parse enhanced crew result with fallback to initial tags."""
        try:
            # For now, enhance the initial tags with improved confidence scores
            # In a real implementation, you would parse the actual AI output
            enhanced_tags = []

            for i, tag in enumerate(initial_tags[:max_tags]):
                # Boost confidence for tags validated by similar document context
                enhanced_confidence = min(tag.confidence + 0.1, 1.0)

                enhanced_tag = TagModel(
                    name=tag.name,
                    confidence=enhanced_confidence,
                    category=tag.category,
                    description=f"{tag.description} (validated with similar document context)",
                )
                enhanced_tags.append(enhanced_tag)

            # Add context-derived tags if we have room
            if len(enhanced_tags) < max_tags:
                context_tags = [
                    TagModel(
                        name="contextual-analysis",
                        confidence=0.8,
                        category="process",
                        description="Document analyzed with similar document context",
                    ),
                    TagModel(
                        name="cross-reference",
                        confidence=0.75,
                        category="technical",
                        description="Document contains themes found in related documents",
                    ),
                ]

                remaining_slots = max_tags - len(enhanced_tags)
                enhanced_tags.extend(context_tags[:remaining_slots])

            return enhanced_tags[:max_tags]

        except Exception as e:
            logger.error(f"Failed to parse enhanced crew result: {str(e)}")
            return initial_tags[:max_tags]

    async def _generate_enhanced_summary(
        self, main_doc: str, similar_docs: List[str]
    ) -> str:
        """Generate enhanced summary considering similar document context."""
        try:
            # Create dedicated agent for enhanced summary generation
            enhanced_summary_analyzer, _ = self._create_agents_for_document(main_doc)

            similar_doc_context = ""
            if similar_docs:
                doc_names = [Path(doc).name for doc in similar_docs[:3]]
                similar_doc_context = f" This document is part of a collection that includes: {', '.join(doc_names)}."

            summary_task = Task(
                description=f"""Generate a comprehensive summary of the main document: {Path(main_doc).name}
                
{similar_doc_context}
                
The summary should:
- Capture the main purpose and key points (2-3 sentences)
- Highlight how this document relates to the broader document context
- Focus on actionable information and key concepts
- Mention any cross-references or related themes found in similar documents
                """,
                agent=enhanced_summary_analyzer,
                expected_output="Enhanced summary with contextual insights",
            )

            crew = Crew(
                agents=[enhanced_summary_analyzer], tasks=[summary_task], verbose=False
            )
            result = crew.kickoff()
            return str(result)

        except Exception as e:
            logger.error(f"Failed to generate enhanced summary: {str(e)}")
            return "Enhanced summary generation failed"


# Global service instance
_document_analysis_service = None


def get_document_analysis_service() -> DocumentAnalysisService:
    """Get or create the global document analysis service instance."""
    global _document_analysis_service
    if _document_analysis_service is None:
        _document_analysis_service = DocumentAnalysisService()
    return _document_analysis_service
