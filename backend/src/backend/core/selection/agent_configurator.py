"""CrewAI agent configuration service for document analysis with dynamic tool selection."""
import logging
from typing import Dict, List, Optional, Any, Set
from pathlib import Path
import uuid

from crewai import Agent, Task, Crew
from crewai.tools import BaseTool

from ...schema.document_analysis import TagModel, AnalyzeDocumentResponse
from ..processing import get_document_tool_factory, DocumentToolFactory
from .tag_based_selector import get_tag_based_selector, TagBasedDocumentSelector
from ..config import get_settings

logger = logging.getLogger(__name__)


class AgentConfigurator:
    """Configures CrewAI agents with appropriate tools based on selected documents."""
    
    def __init__(
        self,
        tool_factory: Optional[DocumentToolFactory] = None,
        tag_selector: Optional[TagBasedDocumentSelector] = None
    ):
        """Initialize the agent configurator.
        
        Args:
            tool_factory: Document tool factory for creating RAG tools
            tag_selector: Tag-based document selector
        """
        self.settings = get_settings()
        self.tool_factory = tool_factory or get_document_tool_factory()
        self.tag_selector = tag_selector or get_tag_based_selector()
        
    def configure_analysis_agents(
        self, 
        selected_documents: List[str],
        target_tags: Optional[List[TagModel]] = None
    ) -> Dict[str, Any]:
        """Configure agents with appropriate tools for the selected documents.
        
        Args:
            selected_documents: List of document paths to analyze
            target_tags: Target tags for context (optional)
            
        Returns:
            Dictionary containing configured agents and tools
        """
        if not selected_documents:
            logger.warning("No documents provided for agent configuration")
            return self._create_basic_configuration()
        
        # Group documents by file type for optimized tool selection
        tool_mapping = self._create_tool_mapping(selected_documents)
        
        # Create tools for each document type
        configured_tools = self._create_document_tools(tool_mapping)
        
        # Configure specialized agents based on document types
        agents = self._create_specialized_agents(configured_tools, target_tags)
        
        # Create analysis tasks
        tasks = self._create_analysis_tasks(agents, selected_documents, target_tags)
        
        return {
            "agents": agents,
            "tools": configured_tools,
            "tasks": tasks,
            "tool_mapping": tool_mapping,
            "document_count": len(selected_documents)
        }
    
    def _create_tool_mapping(self, documents: List[str]) -> Dict[str, List[str]]:
        """Create mapping of file extensions to document paths.
        
        Args:
            documents: List of document paths
            
        Returns:
            Dictionary mapping extensions to document lists
        """
        tool_mapping = {}
        
        for doc_path in documents:
            file_ext = Path(doc_path).suffix.lower()
            
            if file_ext not in tool_mapping:
                tool_mapping[file_ext] = []
            tool_mapping[file_ext].append(doc_path)
        
        logger.info(f"Tool mapping created: {tool_mapping}")
        return tool_mapping
    
    def _create_document_tools(self, tool_mapping: Dict[str, List[str]]) -> Dict[str, List[BaseTool]]:
        """Create appropriate RAG tools for each document type.
        
        Args:
            tool_mapping: Mapping of extensions to document paths
            
        Returns:
            Dictionary mapping tool types to tool instances
        """
        configured_tools = {
            "txt_tools": [],
            "pdf_tools": [],
            "docx_tools": [],
            "fallback_tools": []
        }
        
        for file_ext, doc_paths in tool_mapping.items():
            try:
                # Apply concurrent processing limits
                concurrent_limit = self.tool_factory.get_concurrent_limit(file_ext)
                limited_docs = doc_paths[:concurrent_limit]
                
                if len(doc_paths) > concurrent_limit:
                    logger.warning(
                        f"Limited {file_ext} documents to {concurrent_limit} "
                        f"(was {len(doc_paths)}) due to concurrent processing limits"
                    )
                
                # Create tools for each document
                for doc_path in limited_docs:
                    try:
                        tool = self.tool_factory.create_tool(doc_path)
                        
                        # Categorize tools by type
                        if file_ext in ['.txt', '.md']:
                            configured_tools["txt_tools"].append(tool)
                        elif file_ext == '.pdf':
                            configured_tools["pdf_tools"].append(tool)
                        elif file_ext == '.docx':
                            configured_tools["docx_tools"].append(tool)
                        else:
                            configured_tools["fallback_tools"].append(tool)
                            
                    except Exception as e:
                        logger.error(f"Failed to create tool for {doc_path}: {str(e)}")
                        continue
                        
            except Exception as e:
                logger.error(f"Failed to process {file_ext} documents: {str(e)}")
                continue
        
        total_tools = sum(len(tools) for tools in configured_tools.values())
        logger.info(f"Created {total_tools} tools across {len(configured_tools)} categories")
        
        return configured_tools
    
    def _create_specialized_agents(
        self, 
        configured_tools: Dict[str, List[BaseTool]],
        target_tags: Optional[List[TagModel]] = None
    ) -> Dict[str, Agent]:
        """Create specialized agents based on available tools and context.
        
        Args:
            configured_tools: Dictionary of categorized tools
            target_tags: Target tags for context
            
        Returns:
            Dictionary of configured agents
        """
        agents = {}
        
        # Combine all tools for the main analyzer
        all_tools = []
        for tool_category in configured_tools.values():
            all_tools.extend(tool_category)
        
        # Create context-aware backstory based on target tags
        context_info = ""
        if target_tags:
            tag_names = [tag.name for tag in target_tags[:5]]  # Limit for readability
            context_info = f" Pay special attention to content related to: {', '.join(tag_names)}."
        
        # Main document analyzer with all available tools
        agents["document_analyzer"] = Agent(
            role="Document Analysis Expert",
            goal="Analyze documents using appropriate RAG tools and extract meaningful tags that capture key topics and themes",
            backstory=f"""You are an expert in document analysis and information extraction. 
            You have access to specialized tools for different document types (PDF, DOCX, TXT/MD) and can 
            efficiently process multiple documents to identify patterns, themes, and important concepts.
            You excel at creating precise, relevant tags that help organize and categorize information.{context_info}""",
            verbose=True,
            allow_delegation=False,
            tools=all_tools,
            llm="gemini/gemini-2.0-flash-exp",
            max_retry_limit=2
        )
        
        # Tag validator with focus on consistency
        agents["tag_validator"] = Agent(
            role="Tag Quality Validator", 
            goal="Validate tags for accuracy, relevance, and consistency across multiple documents",
            backstory="""You are a quality assurance expert specializing in information taxonomy. 
            You ensure tags are meaningful, consistently formatted, and provide value for document organization.
            You eliminate redundant tags, standardize naming conventions, and assign confidence scores based 
            on content relevance and tag utility.""",
            verbose=True,
            allow_delegation=False,
            llm="gemini/gemini-2.0-flash-exp",
            max_retry_limit=2
        )
        
        # Add specialized agents if we have many documents of specific types
        if len(configured_tools["pdf_tools"]) >= 3:
            agents["pdf_specialist"] = Agent(
                role="PDF Document Specialist",
                goal="Specialized analysis of PDF documents with focus on structure and technical content",
                backstory="""You specialize in analyzing PDF documents, understanding their structure, 
                and extracting meaningful information from technical documentation, reports, and formal documents.""",
                verbose=True,
                allow_delegation=False,
                tools=configured_tools["pdf_tools"],
                llm="gemini/gemini-2.0-flash-exp"
            )
        
        logger.info(f"Created {len(agents)} specialized agents")
        return agents
    
    def _create_analysis_tasks(
        self,
        agents: Dict[str, Agent],
        documents: List[str],
        target_tags: Optional[List[TagModel]] = None
    ) -> List[Task]:
        """Create analysis tasks for the configured agents.
        
        Args:
            agents: Dictionary of configured agents
            documents: List of document paths
            target_tags: Target tags for context
            
        Returns:
            List of configured tasks
        """
        tasks = []
        
        # Context for task descriptions
        doc_list = "\\n".join([f"- {Path(doc).name}" for doc in documents[:10]])
        if len(documents) > 10:
            doc_list += f"\\n- ... and {len(documents) - 10} more documents"
        
        context_guidance = ""
        if target_tags:
            tag_context = ", ".join([tag.name for tag in target_tags[:5]])
            context_guidance = f"\\nPay special attention to themes related to: {tag_context}"
        
        # Main analysis task
        analysis_task = Task(
            description=f"""Analyze the following documents using appropriate RAG tools:
{doc_list}

For each document:
1. Use the correct RAG tool based on file type (.txt/.md → TextRagTool, .pdf → PdfRagTool, .docx → DocxRagTool)
2. Extract key themes, concepts, and topics
3. Generate 5-10 relevant tags with confidence scores
4. Ensure tags are specific and actionable{context_guidance}

Return results in a structured format with file paths, extracted tags, and confidence scores.""",
            agent=agents["document_analyzer"],
            expected_output="Structured analysis results with tags and confidence scores for each document"
        )
        tasks.append(analysis_task)
        
        # Tag validation task
        validation_task = Task(
            description="""Review and validate the generated tags from the document analysis:

1. Check for tag accuracy and relevance
2. Eliminate duplicate or redundant tags
3. Standardize tag naming conventions
4. Assign final confidence scores
5. Ensure tags provide value for document organization
6. Group related tags when appropriate

Return a refined set of high-quality tags.""",
            agent=agents["tag_validator"],
            expected_output="Validated and refined tag set with standardized formatting and confidence scores"
        )
        tasks.append(validation_task)
        
        logger.info(f"Created {len(tasks)} analysis tasks")
        return tasks
    
    def _create_basic_configuration(self) -> Dict[str, Any]:
        """Create basic configuration when no documents are available.
        
        Returns:
            Basic configuration dictionary
        """
        logger.info("Creating basic configuration with no documents")
        
        return {
            "agents": {},
            "tools": {"txt_tools": [], "pdf_tools": [], "docx_tools": [], "fallback_tools": []},
            "tasks": [],
            "tool_mapping": {},
            "document_count": 0
        }


# Global configurator instance
_agent_configurator: Optional[AgentConfigurator] = None


def get_agent_configurator() -> AgentConfigurator:
    """Get or create the global agent configurator instance."""
    global _agent_configurator
    if _agent_configurator is None:
        _agent_configurator = AgentConfigurator()
    return _agent_configurator


def reset_configurator() -> None:
    """Reset the global configurator instance (useful for testing)."""
    global _agent_configurator
    _agent_configurator = None
