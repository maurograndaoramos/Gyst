# Document Analysis Endpoint Implementation

This document describes the implementation of the FastAPI `/analyze_document` endpoint that integrates with CrewAI for intelligent document tagging.

## Overview

The `/analyze_document` endpoint provides AI-powered document analysis using CrewAI framework with Google Gemini 2.0 to automatically generate semantic tags for uploaded documents. The implementation follows enterprise-grade security practices and provides comprehensive error handling.

## Architecture

### Core Components

1. **FastAPI Endpoint** (`/api/documents/analyze`)
   - Request validation with Pydantic models
   - Security measures (path validation, file existence checks)
   - Comprehensive error handling with proper HTTP status codes
   - Request ID tracking for monitoring

2. **CrewAI Service** (`DocumentAnalysisService`)
   - Multi-agent system for document analysis
   - Specialized RAG tools for different file formats
   - Tag generation and validation pipeline
   - Optional document summarization

3. **Pydantic Models** (`document_analysis.py`)
   - Request/response schemas with validation
   - Tag model with confidence scoring
   - Error response standardization

4. **Configuration Management** (`config.py`)
   - Environment variable handling
   - Settings validation
   - Configurable parameters

## API Specification

### Endpoint: `POST /api/documents/analyze`

**Request Body:**
```json
{
  "document_path": "example.txt",
  "max_tags": 10,
  "generate_summary": false
}
```

**Success Response (200):**
```json
{
  "request_id": "uuid-string",
  "document_path": "example.txt",
  "status": "completed",
  "tags": [
    {
      "name": "technical-documentation",
      "confidence": 0.85,
      "category": "technical",
      "description": "Document contains technical information and procedures"
    }
  ],
  "summary": "Optional document summary...",
  "processing_time_seconds": 12.34,
  "created_at": "2025-01-01T12:00:00Z"
}
```

**Error Response (400/404/422/500):**
```json
{
  "request_id": "uuid-string",
  "error": "error_type",
  "message": "Human-readable error message",
  "details": "Additional error details",
  "created_at": "2025-01-01T12:00:00Z"
}
```

### Additional Endpoints

- `GET /api/documents/analyze/{request_id}/status` - Check analysis status
- `GET /api/documents/health` - Service health check

## Security Features

### Path Validation
- **Directory Traversal Prevention**: Blocks `../`, absolute paths, and backslashes
- **File Extension Validation**: Only allows `.txt`, `.md`, `.pdf`, `.docx` files
- **Upload Directory Restriction**: Ensures files are within designated upload directory

### Input Validation
- **Pydantic Models**: Comprehensive request validation with type checking
- **Parameter Bounds**: Limits on tag count (1-50), file size, etc.
- **File Existence**: Verifies file exists before processing

### Error Handling
- **Structured Error Responses**: Consistent error format with proper HTTP codes
- **Request ID Tracking**: Every request gets a unique identifier for monitoring
- **Security-Conscious Messages**: Avoids exposing internal system details

## CrewAI Integration

### Agents

1. **Document Analysis Expert**
   - Role: Analyze documents and extract meaningful tags
   - Tools: FileReadTool, PDFSearchTool, DOCXSearchTool
   - Goal: Identify key topics, concepts, technologies, and processes

2. **Tag Quality Validator**
   - Role: Validate and refine generated tags
   - Goal: Ensure accuracy, consistency, and proper confidence scoring

### Task Pipeline

1. **Analysis Task**: Read document and generate initial tags
2. **Validation Task**: Review and refine tags for quality
3. **Summary Task**: Generate concise document summary (optional)

### RAG Tool Selection

The service automatically selects appropriate tools based on file extension:
- `.pdf` files → PDFSearchTool
- `.docx` files → DOCXSearchTool  
- `.txt`, `.md` files → FileReadTool

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```bash
# Required
GEMINI_API_KEY=your_google_gemini_api_key_here

# Optional (with defaults)
HOST=0.0.0.0
PORT=8000
DEBUG=false
UPLOAD_BASE_DIR=./uploads
MAX_FILE_SIZE_MB=10
DEFAULT_MAX_TAGS=10
MAX_ANALYSIS_TIME_SECONDS=300
LOG_LEVEL=INFO
```

### Dependencies

Key dependencies in `pyproject.toml`:
- `fastapi>=0.115.12` - Web framework
- `crewai>=0.120.1` - AI agent orchestration
- `crewai-tools>=0.45.0` - RAG tools for document processing
- `google-generativeai>=0.8.0` - Gemini API integration
- `pydantic>=2.11.4` - Data validation
- `pydantic-settings>=2.0.0` - Configuration management

## Usage Examples

### Basic Document Analysis

```python
import requests

response = requests.post("http://localhost:8000/api/documents/analyze", json={
    "document_path": "technical_guide.txt",
    "max_tags": 5
})

if response.status_code == 200:
    result = response.json()
    print(f"Generated {len(result['tags'])} tags:")
    for tag in result['tags']:
        print(f"- {tag['name']} ({tag['confidence']:.2f})")
```

### With Summary Generation

```python
response = requests.post("http://localhost:8000/api/documents/analyze", json={
    "document_path": "incident_report.md",
    "max_tags": 8,
    "generate_summary": True
})

result = response.json()
print(f"Summary: {result['summary']}")
print(f"Tags: {[tag['name'] for tag in result['tags']]}")
```

## Testing

### Running Tests

```bash
# Install test dependencies
pip install pytest httpx

# Run all tests
pytest backend/tests/test_document_analysis.py -v

# Run only validation tests
pytest backend/tests/test_document_analysis.py::TestDocumentAnalysisEndpoint -v

# Run integration tests (requires GEMINI_API_KEY)
pytest backend/tests/test_document_analysis.py -m integration -v
```

### Test Coverage

- **Path validation security tests**
- **Input validation and boundary tests**
- **Error handling scenarios**
- **Pydantic model validation**
- **Integration tests with real files** (requires API key)

## Performance Considerations

### Current Limitations (MVP)
- **Synchronous Processing**: Analysis blocks the request thread
- **Single Service Instance**: No horizontal scaling
- **Local File Storage**: Not suitable for distributed deployments
- **Rate Limiting**: Constrained by Gemini API limits

### Optimization Opportunities
- **Async Background Processing**: Queue-based task processing
- **Caching**: Cache results for identical documents
- **Batch Processing**: Analyze multiple documents together
- **Result Streaming**: Stream tags as they're generated

## Monitoring and Logging

### Structured Logging
- Request/response logging with request IDs
- Processing time tracking
- Error logging with context
- Configurable log levels

### Metrics to Monitor
- Request volume and response times
- Error rates by type
- Document processing success rates
- Tag generation quality metrics

## Deployment

### Development Setup

```bash
# Clone repository
cd backend

# Install dependencies
pip install -e .

# Set up environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Create uploads directory
mkdir -p uploads

# Run the server
python main.py
```

### Production Considerations

1. **Environment Variables**: Use proper secrets management
2. **File Storage**: Migrate to cloud storage (S3, GCS)
3. **Database**: Add persistent storage for request tracking
4. **Load Balancing**: Multiple service instances
5. **Monitoring**: APM tools, health checks, metrics collection

## API Documentation

When running the server, interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Future Enhancements

### Planned Features
1. **Async Processing**: Background job queue with status tracking
2. **Enhanced Parsing**: Better extraction from complex document formats
3. **Custom Models**: Fine-tuned models for specific document types
4. **Batch Operations**: Analyze multiple documents in one request
5. **Tag Relationships**: Identify semantic relationships between tags
6. **Confidence Calibration**: Improve confidence score accuracy

### Integration Points
- **Database Storage**: Persist tags and analysis results
- **Search Integration**: Connect with document search systems
- **Workflow Automation**: Trigger actions based on detected tags
- **Analytics Dashboard**: Visualize document analysis trends

## Support and Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY environment variable is required"**
   - Ensure API key is set in `.env` file
   - Verify key is valid and has sufficient quota

2. **"Document not found" errors**
   - Check file exists in uploads directory
   - Verify path doesn't contain directory traversal attempts

3. **Validation errors**
   - Ensure file has supported extension (.txt, .md, .pdf, .docx)
   - Check max_tags is between 1-50

4. **Service unavailable**
   - Verify Gemini API connectivity
   - Check API key permissions and quota

### Getting Help

For implementation questions or issues:
1. Check the logs for detailed error messages
2. Verify environment configuration
3. Test with the provided test files
4. Review the API documentation at `/docs`
