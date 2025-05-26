# Architecture Overview

## System Overview

Gyst is an AI-native document management system designed to act as an intelligent knowledge base for teams. The system adopts a two-tier architecture comprising a Next.js application (handling frontend, backend API, user management, and database interaction) and a dedicated Python FastAPI service leveraging CrewAI framework with Gemini 2.0 API and RAG tools for AI-driven tasks. Files are stored locally, and metadata, tags, and user information are managed in an SQLite database.

## Component Details

### Next.js Application

The Next.js application serves as the user-facing interface and the primary backend coordination layer. It handles user authentication, manages the database, serves files, and orchestrates calls to the Python AI service.

**Frontend Components:**

- **AppComponent**: Main application container, incorporating role-based UI elements and organization-based data filtering.
- **FileExplorerComponent**: Displays the organization's folder/file structure accessible to the user based on their role and organization membership.
- **DocumentViewerComponent**: Renders different document types (.txt, .md, .pdf, .docx) based on content retrieved via the backend.
- **ChatInterfaceComponent**: Handles user interaction with the AI agent, supporting contextual conversations about documents.
- **SearchComponent**: Manages document and tag search based on database queries with organization-based filtering.
- **AuthComponents**: Handles user login, registration, role display, and organization assignment using NextAuth V5.

**Backend Components (Next.js API Routes):**

- **Auth API**: Handles user authentication, registration, and session management using NextAuth V5. Manages user roles (Admin/User) and organization associations.
- **Document API**: Handles document upload (restricted to Admin role), metadata extraction, and retrieval requests. Triggers AI tagging via the Python service upon upload. Handles serving document content for viewing with organization-based access control.
- **Tag API**: Manages tag information, primarily interacting with the SQLite database. Handles tag creation and document-tag relationship management.
- **Search API**: Processes search requests against the SQLite database (metadata, tags) with automatic organization filtering based on user session.
- **Chat API**: Handles user chat interactions, retrieving necessary document context (paths, metadata) from the database and forwarding the query and context to the Python FastAPI service.
- **Python Service Connector**: Module responsible for making HTTP requests to the Python FastAPI service endpoints and handling responses.
- **Database Adapter**: Module specifically for interacting with the SQLite database (gyst.sqlite). This is the only component that directly interacts with the SQLite database file.

**Key Libraries:**

- Next.js 15+
- NextAuth V5 (Beta) for authentication and role management
- React with TypeScript
- react-pdf, react-markdown for document rendering
- Tailwind CSS for styling
- better-sqlite3 for SQLite database interaction

### Python FastAPI Service

A dedicated Python service hosting CrewAI framework and its RAG tools. It performs computationally intensive AI tasks related to document analysis, tagging, chat responses, and content correlation by reading files from the shared local storage path provided by the Next.js backend.

**Key Endpoints:**

- **/analyze_document**: Receives a document file path from Next.js, triggers a CrewAI task for intelligent tagging using appropriate RAG tools, and returns suggested tags with confidence scores.
- **/chat**: Receives a user query and relevant document context (file paths, summaries, metadata) from Next.js, triggers a CrewAI chat task using RAG tools to analyze document content, and returns a generated response with source document references.
- **/correlate**: Receives specific document identifiers/paths from Next.js, triggers a CrewAI task to find correlations or summarize content across multiple documents using RAG tools, and returns the correlation analysis.

**Core Functions:**

- **Crew Orchestrator**: Sets up and runs CrewAI tasks based on incoming API requests, managing the lifecycle of AI agents and their assigned tasks.
- **RAG Tool Handler**: Configures and utilizes CrewAI's RAG tools (FileRAGTool, DocxRagTool, PdfRagTool, TextRagTool) to read and process document content directly from the provided file paths.
- **Tag Generation Task**: Defines the CrewAI agents and tasks required to analyze document content via RAG and extract relevant tags with semantic understanding.
- **Chat Response Task**: Defines the CrewAI agents and tasks required to generate conversational responses based on a query and provided document context from RAG analysis.
- **Correlation Task**: Defines the CrewAI agents and tasks to analyze content from multiple documents via RAG and identify relationships, patterns, or provide comprehensive summaries.

**Key Libraries:**

- FastAPI for the web framework
- Pydantic for data validation and serialization
- crewai, crewai_tools (specifically RAG tools like FileRAGTool, DocxRagTool, PdfRagTool, TextRagTool)
- Google Gemini 2.0 API integration for the underlying LLM
- httpx for external API calls to Gemini 2.0

### Database (SQLite)

A single gyst.sqlite file is used for storing all structured data. The schema is managed using Drizzle ORM, which also handles database migrations.

- **Access:** Only the Next.js application interacts directly with the gyst.sqlite file. The Python service receives necessary data from Next.js via API parameters and fetches relevant document content using file paths provided by Next.js.

- **Key Tables:**
  - **users**: Stores user information. Note: `role` and direct `organization_id` are not in the current `schema.ts` but are conceptual.
    - id (string, primary key)
    - name (string)
    - username (string)
    - email (string, unique, not null)
    - password (string) // For credentials auth
    - emailVerified (timestamp)
    - image (string)
    - created_at (timestamp, not null)
    - updated_at (timestamp, not null)

  - **organizations**: Stores organization information for multi-tenancy.
    - id (string, primary key)
    - name (string, unique, not null)
    - owner_id (string, not null, foreign key to users.id, onDelete: 'cascade')
    - created_at (timestamp, not null)
    - updated_at (timestamp, not null)

  - **(Other NextAuth V5 tables like accounts, sessions, verificationTokens, authenticators exist for authentication purposes and are linked to the users table.)**

  - **documents**: Stores document metadata. Linked to organizations for data isolation.
    - id (string, primary key)
    - organization_id (foreign key)
    - filename (string, hashed name in ./uploads)
    - original_filename (string)
    - file_path (string, path relative to ./uploads)
    - file_type (string, .txt, .md, .pdf, .docx)
    - file_size (integer)
    - uploaded_by_user_id (foreign key)
    - created_at (timestamp)

  - **tags**: Stores unique tag names generated by AI or manually added.
    - id (string, primary key)
    - name (string, unique)
    - created_at (timestamp)

  - **document_tags**: Maps documents to tags with AI confidence scores.
    - id (string, primary key)
    - document_id (foreign key)
    - tag_id (foreign key)
    - confidence (float, AI confidence score 0.0-1.0)
    - created_at (timestamp)

- **Seeding**: A `frontend/src/lib/db/seed.ts` script is available to populate the database with initial data for development and testing.

### AI Service (CrewAI & RAG Tools)

CrewAI orchestrates agents and tasks to provide AI capabilities, primarily by using RAG tools to read and process document content stored locally.

- **Core Functionality**:
  - **Document Analysis/Tagging**: CrewAI agents read uploaded document content (via RAG tools on the file path) and generate contextually relevant tags using Gemini 2.0's language understanding capabilities.
  - **Conversational Responses**: CrewAI agents answer user questions in the chat interface, retrieving relevant document snippets using RAG tools based on context provided by Next.js, and generating natural language responses.
  - **Document Correlation/Summarization**: CrewAI agents can analyze content from multiple documents (via RAG tools) to find relationships, summarize information, identify patterns, or highlight contradictions upon request.

- **LLM Provider**: CrewAI interfaces with Google Gemini 2.0 API, providing advanced language understanding and generation capabilities optimized for technical documentation analysis.

- **RAG Integration**: Uses specialized CrewAI RAG tools for different file types:
  - FileRAGTool for general text files (.txt, .md)
  - PdfRagTool for PDF documents
  - DocxRagTool for Word documents
  - TextRagTool for plain text processing

### File Storage Approach

Files are stored locally within the project directory managed by the Next.js application:

- **Base upload directory**: ./uploads
- **Naming convention**: Files stored with SHA-256 hashed filenames to prevent collisions and enhance security
- **Metadata preservation**: Original filenames, hashed filenames, and relative file paths stored in SQLite database
- **Organization structure**: Simple flat structure within ./uploads with potential for organization-based subdirectories
- **Access control**: Next.js backend serves files to frontend with role and organization-based access control. Python FastAPI service reads files directly using paths retrieved by Next.js from the database.

### Inter-Service Communication

Communication between the Next.js backend and the Python FastAPI service is handled via HTTP:

- **Method**: RESTful API endpoints for structured requests with JSON payloads
- **Data Format**: JSON for all data exchange with standardized request/response schemas
- **Flow**: Next.js acts as the client, initiating requests to Python service endpoints (/analyze_document, /chat, /correlate). Next.js includes necessary data (document IDs, file paths retrieved from SQLite database, user queries, context) in the request body.
- **Authentication**: Service-to-service authentication mechanism between Next.js and Python service for secure internal communication
- **Error Handling**: Comprehensive error handling with proper HTTP status codes and error message propagation

### Security Considerations

Comprehensive security measures for the MVP include:

- **Authentication**: NextAuth V5 integration with role-based access control (Admin upload permissions, User view/chat permissions)
- **Input validation**: Comprehensive validation on all Next.js API endpoints with request sanitization
- **File security**: File type and size restrictions on uploads with MIME type validation
- **Database security**: Direct database access restricted to Next.js backend only, preventing concurrent access issues
- **Path security**: File paths provided to Python service validated by Next.js to prevent directory traversal attacks
- **Organization isolation**: All database queries automatically filtered by user's organization ID to ensure data privacy
- **Session management**: Secure session handling with proper token expiration and renewal

### Scalability Limitations (MVP)

This architecture has intentional limitations for the MVP phase:

- **Local File Storage**: Not suitable for production scale or multi-instance deployments without shared file system or cloud storage migration
- **Single SQLite Database File**: Performance may degrade with large numbers of documents or concurrent users. Not optimal for high availability deployments
- **Single Python Service Instance**: The CrewAI service represents a potential bottleneck for processing concurrent requests, requiring horizontal scaling for production use
- **Limited AI Capabilities**: Constrained by Gemini 2.0 API rate limits and the complexity of CrewAI tasks defined for the MVP scope
- **Basic Multi-Tenancy**: While user roles and organization IDs provide data isolation, advanced multi-tenancy features (resource quotas, detailed permissions, tenant-specific configurations) are not fully implemented

### Performance Targets

- **Document Processing**: Files up to 5MB processed and tagged within 120 seconds
- **Search Performance**: Database searches return results within 4 seconds
- **AI Response Time**: Chat responses generated within 30 seconds for initial queries
- **Concurrent Usage**: Support for 5-10 concurrent users during demonstration
- **File Upload**: Upload processing and storage within 10 seconds for typical files
