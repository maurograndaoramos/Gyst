# CrewAI Agent Configuration for Document Analysis Implementation

## Overview

This implementation provides a complete solution for CrewAI agent configuration with dynamic tool selection for document analysis using appropriate RAG tools. The system uses tag-based document selection to find similar documents and enforces a 5-document limit per analysis for optimal performance.

**🔧 Recent Enhancement: Core Module Restructuring**
The core module has been reorganized into logical subfolders for better maintainability and clarity. See [CORE_RESTRUCTURING_DOCS.md](./CORE_RESTRUCTURING_DOCS.md) for detailed information about the new structure.

## Implementation Summary

### ✅ Completed Components

1. **Tag-Based Document Selector** (`core/selection/tag_based_selector.py`)
   - Finds similar documents based on AI-generated tags
   - Implements tag matching with confidence scoring
   - Supports partial matching for related concepts
   - Enforces 5-document limit per analysis

2. **Enhanced Document Tool Factory** (`core/processing/document_tool_factory.py`)
   - Dynamic tool selection based on file extension
   - Maps `.txt/.md` → `TXTSearchTool` (TextRagTool)
   - Maps `.pdf` → `PDFSearchTool` (PdfRagTool) 
   - Maps `.docx` → `DOCXSearchTool` (DocxRagTool)
   - Robust fallback handling for tool failures
   - Concurrent processing limits per file type

3. **Agent Configurator** (`core/selection/agent_configurator.py`)
   - Configures CrewAI agents with appropriate tools
   - Creates specialized agents based on document types
   - Manages memory and tool assignment
   - Handles agent configuration parameters

4. **Enhanced Batch Processor** (`core/processing/batch_processor.py`)
   - Integrates tag-based selection with batch processing
   - Enforces 5-document limit per analysis
   - Provides agent configuration for batch operations
   - Handles errors and fallbacks gracefully

5. **Enhanced CrewAI Service** (`core/services/crewai_service.py`)
   - New method for analyzing with similar documents
   - Context-aware analysis using related documents
   - Enhanced summary generation with cross-document insights
   - Backward compatibility with existing functionality

6. **Core Module Organization** (NEW)
   - Reorganized into logical subfolders: `config/`, `services/`, `processing/`, `selection/`, `error_handling/`
   - Improved maintainability and clarity
   - Better separation of concerns
   - Enhanced scalability for future development

## Key Features

### 🏷️ Tag-Based Document Selection
- Uses AI-generated tags to find semantically similar documents
- Prioritizes documents by tag match strength
- Supports confidence-based scoring
- Handles partial matches for related concepts

### 🔧 Dynamic Tool Selection
```python
# File extension → Tool mapping
{
    '.txt': TXTSearchTool,    # TextRagTool equivalent
    '.md': TXTSearchTool,     # TextRagTool equivalent  
    '.pdf': PDFSearchTool,    # PdfRagTool
    '.docx': DOCXSearchTool   # DocxRagTool
}
```

### 📋 Document Limit Enforcement
- Maximum 5 documents per analysis
- Configurable limit in tag selector
- Enforced at multiple levels (selector, factory, processor)

### 🛡️ Fallback Handling
- Primary tool → Fallback tools → FileReadTool
- Graceful degradation on tool failures
- Comprehensive error logging and recovery

## Usage Examples

### Basic Tag-Based Selection
```python
from backend.core.tag_based_selector import get_tag_based_selector

selector = get_tag_based_selector(max_documents=5)

# Target tags from your document
target_tags = [
    TagModel(name="api-documentation", confidence=0.9, category="technical"),
    TagModel(name="authentication", confidence=0.85, category="security")
]

# Available documents with their tags
available_docs = {
    "api_guide.md": [TagModel(name="api-documentation", confidence=0.95, category="technical")],
    "auth_setup.txt": [TagModel(name="authentication", confidence=0.9, category="security")]
}

# Select similar documents
selected = await selector.select_relevant_documents(
    target_tags=target_tags,
    available_documents=available_docs
)
```

### Agent Configuration
```python
from backend.core.agent_configurator import get_agent_configurator

configurator = get_agent_configurator()

# Configure agents for selected documents
config = configurator.configure_analysis_agents(
    selected_documents=["doc1.txt", "doc2.pdf", "doc3.docx"],
    target_tags=target_tags
)

# Access configured components
agents = config["agents"]
tools = config["tools"] 
tasks = config["tasks"]
```

### Enhanced Document Analysis
```python
from backend.core.crewai_service import get_document_analysis_service

service = get_document_analysis_service()

# Analyze with similar document context
result = await service.analyze_with_similar_documents(
    document_path="new_document.pdf",
    available_documents=existing_docs_with_tags,
    max_tags=10,
    generate_summary=True
)
```

### Batch Processing
```python
from backend.core.batch_processor import TagRelevantBatchProcessor

processor = TagRelevantBatchProcessor()

# Process batch with tag-based selection
result = await processor.process_with_tag_based_selection(
    target_tags=target_tags,
    available_documents=available_docs
)
```

## Configuration

### Tool Factory Configuration
The tool factory uses a unified configuration for all RAG tools:

```python
config = {
    "llm": {
        "provider": "google",  # Compatible with CrewAI tools
        "config": {
            "model": "gemini-2.0-flash-exp",
            "temperature": 0.3,
            "max_tokens": 4096,
            "top_p": 0.8
        }
    },
    "embedder": {
        "provider": "google",
        "config": {
            "model": "models/embedding-001",
            "task_type": "retrieval_document"
        }
    }
}
```

### Concurrent Processing Limits
- Text files (.txt, .md): 5 concurrent
- PDF files (.pdf): 3 concurrent  
- Word documents (.docx): 3 concurrent

## Architecture Flow

1. **Document Input** → Target document with analysis request
2. **Tag Generation** → AI generates initial tags for target document
3. **Similar Document Selection** → Tag-based selector finds related documents (max 5)
4. **Tool Factory** → Creates appropriate RAG tools based on file types
5. **Agent Configuration** → Configures CrewAI agents with selected tools
6. **Analysis Execution** → Processes documents with enhanced context
7. **Result Generation** → Returns enriched analysis with cross-document insights

## Error Handling

- **Tool Creation Failures**: Automatic fallback to alternative tools
- **File Access Issues**: Validation and graceful error reporting  
- **Agent Configuration Errors**: Safe defaults and error recovery
- **Processing Timeouts**: Configurable limits with timeout handling
- **Batch Processing Failures**: Individual document error isolation

## Performance Optimizations

- Document limit enforcement (max 5 per analysis)
- Concurrent processing limits per file type
- Efficient tag matching algorithms
- Cached tool instances where appropriate
- Optimized batch processing strategies

## Testing

Run the implementation test:
```bash
cd /home/caboz/dev/Gyst/backend
source .venv/bin/activate
python test_implementation.py
```

## Integration Points

### Existing System Integration
- Maintains backward compatibility with current `DocumentAnalysisService`
- Extends existing `TagRelevantBatchProcessor` functionality
- Integrates with existing error handling and configuration systems
- Compatible with current schema definitions

### API Integration
The enhanced service can be integrated into existing API endpoints:
- `/api/documents/analyze` - Enhanced with similar document context
- `/api/documents/batch` - Tag-based batch processing
- `/api/documents/similar` - Find similar documents by tags

## Future Enhancements

1. **Caching Layer**: Implement document tag caching for performance
2. **Advanced Scoring**: Machine learning-based document similarity 
3. **Streaming Analysis**: Real-time document processing capabilities
4. **Multi-language Support**: Extend tag matching for multiple languages
5. **Custom Tool Plugins**: Allow custom RAG tool implementations

## Conclusion

This implementation successfully delivers all requirements:
- ✅ Dynamic tool selection based on file type
- ✅ Appropriate RAG tools (TextRagTool, PdfRagTool, DocxRagTool equivalents)
- ✅ Fallback handling for tool failures  
- ✅ Tag-based document selection with 5-document limit
- ✅ CrewAI agent configuration with memory management
- ✅ Concurrent processing limits
- ✅ Automated factory pattern for tool creation

The system is production-ready and provides a solid foundation for intelligent document analysis with contextual awareness.
