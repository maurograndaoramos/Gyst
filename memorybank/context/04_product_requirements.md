# Product Requirements Document

## Project Overview

Gyst is an AI-native document management system designed to serve as an intelligent knowledge brain for teams, particularly in technical and support contexts. It enables users to centralize internal documentation, leverages AI (via CrewAI framework with Gemini 2.0 API and RAG tools) for automatic organization (tagging) and retrieval (search, chat), and provides different capabilities based on user roles within an organization. The system follows a two-tier architecture: a Next.js application handling UI, user management, and data persistence (SQLite), and a Python FastAPI service orchestrating AI tasks using CrewAI framework.

## Project Scope (14-Day MVP)

The primary goal of the MVP is to establish the core architecture and deliver key functionalities for intelligent document ingestion and retrieval within an organizational context, supporting distinct user roles through a modern, AI-powered interface.

### In Scope:

- **Document Upload**: Support for uploading .txt, .md, .pdf, and .docx file types with role-based restrictions (Admin only)
- **Local File Storage**: Securely storing uploaded files locally with SHA-256 hashed filenames in ./uploads directory
- **Document Viewing**: Ability to render and view uploaded documents within the application using specialized viewers for each file type
- **Automatic Tag Generation**: Leveraging CrewAI framework with Gemini 2.0 API and RAG tools to automatically generate contextually relevant tags upon document upload
- **Tag-Based Document Relationships**: Advanced ability to query and view documents based on shared tags with relevance scoring
- **Comprehensive Search Functionality**: Searching documents based on metadata (filename, tags) and content with organization-based filtering
- **AI Chat Interface**: A sophisticated conversational interface to query documents using natural language
- **AI-Assisted Retrieval & Correlation**: Using CrewAI and RAG within the chat interface to:
  - Answer questions based on document content analysis
  - Identify and link source documents in AI responses with confidence scores
  - Find correlations and summarize information across selected documents
  - Provide contextual recommendations for related documents
- **User Authentication & Authorization**: Implementing secure user accounts with distinct 'Admin' and 'User' roles using NextAuth V5
- **Role-Based Access Control**: Enforcing that only 'Admin' users can upload documents. All authenticated users can view documents within their organization, search, and use the AI chat
- **Organization-Based Data Isolation**: Ensuring users only see documents belonging to their specific organization with comprehensive security measures
- **Responsive Design**: Mobile and desktop responsiveness for core viewing, search, and chat flows
- **Three-Panel Interface**: VS Code-inspired layout with file explorer, document viewer, and AI chat panels

### Out of Scope:

- Advanced hierarchical folder organization/management (tag-based organization prioritized)
- In-application document editing capabilities
- Manual tag management by users (AI-driven tagging for MVP)
- Advanced multi-tenancy features beyond basic organization isolation
- Real-time collaboration features
- Complex AI analysis beyond defined tagging, Q&A, and correlation tasks
- Integrations with external services (cloud storage, third-party APIs)
- Advanced mobile-specific UI optimizations
- Document version control and history
- Advanced user management beyond Admin/User roles

## User Roles & Capabilities

### Admin (Technical User)

**Capabilities:**
- Upload new documents (.txt, .md, .pdf, .docx)
- View all documents within their organization
- Search documents using text queries and tag filters
- Interact with AI chat for document queries and analysis
- Access document correlation and analysis features
- View automatically generated tags and their confidence scores

**Typical Users:** Developers, Product Managers, DevOps Engineers, Technical Writers

### User (Non-Technical User)

**Capabilities:**
- View all documents within their organization
- Search documents using intuitive text queries and tag filters
- Interact with AI chat for finding information and understanding content
- Access document correlation and analysis features
- Cannot upload new documents

**Typical Users:** Customer Support, Sales, Marketing, Project Managers, New Team Members

### Organization Owner (Future)

**Note:** Basic concept included in schema but not fully implemented in MVP
- Manage organization settings
- Add/remove users from organization
- Configure organization-level preferences

## User Stories - Epic Breakdown

### Epic 1: User & Organization Management

**Goal:** Enable secure, role-based access to the system with organization-level data isolation.

- **US 1.1**: As a user, I can access a modern, intuitive login page so I can authenticate with the system using my credentials.
- **US 1.2**: As a user, I can register for a new account and be assigned to an organization so I can access relevant documents.
- **US 1.3**: As the system, upon successful authentication, I establish a secure session with role and organization information so user permissions can be properly enforced.
- **US 1.4**: As a logged-in user, I am automatically associated with my organization so the system filters all data to show only relevant documents.
- **US 1.5**: As a Gyst user, I can only view documents belonging to my organization so my data remains private and relevant to my work context.

### Epic 2: Document Ingestion & AI Processing

**Goal:** Allow authorized users to upload documents and have the system intelligently process and tag them using advanced AI.

- **US 2.1**: As an Admin, I can access an intuitive document upload interface so I can easily add new files to the knowledge base.
- **US 2.2**: As an Admin, I can upload documents in multiple formats (.txt, .md, .pdf, .docx) through drag-and-drop or file selection.
- **US 2.3**: As the system, when an Admin uploads a file, I securely store it with a hashed filename and comprehensive metadata.
- **US 2.4**: As the system, I automatically send uploaded documents to the AI service for intelligent analysis using CrewAI framework.
- **US 2.5**: As the AI service, I use appropriate RAG tools (TextRagTool, PdfRagTool, DocxRagTool) to extract and analyze document content.
- **US 2.6**: As the AI service, I generate contextually relevant tags using Gemini 2.0 API with confidence scores for each tag.
- **US 2.7**: As the system, I store AI-generated tags with their confidence scores and link them to documents for future retrieval.

### Epic 3: Document Access & Discovery

**Goal:** Provide intuitive and powerful ways for users to find and view documents within their organization.

- **US 3.1**: As a Gyst user, I can see an organized list of documents in my organization through an intuitive file explorer interface.
- **US 3.2**: As a Gyst user, I can view documents in multiple formats with high-quality rendering appropriate for each file type.
- **US 3.3**: As a Gyst user, I can search for documents using natural language queries that search across filenames, tags, and metadata.
- **US 3.4**: As a Gyst user, I can filter search results by tags to quickly narrow down to relevant documents.
- **US 3.5**: As a Gyst user, I can see related documents suggested based on shared tags and content similarity.
- **US 3.6**: As a Gyst user, I can see the AI-generated tags for each document with their confidence scores to understand the content categorization.

### Epic 4: AI-Powered Interaction & Analysis

**Goal:** Provide sophisticated AI interaction for document understanding, analysis, and knowledge extraction.

- **US 4.1**: As a Gyst user, I can interact with an intelligent AI assistant through a dedicated chat interface to ask questions about documents.
- **US 4.2**: As a Gyst user, I can ask complex questions about document content and receive accurate, contextual answers with source references.
- **US 4.3**: As a Gyst user, I can request analysis or correlation across multiple documents to identify patterns or relationships.
- **US 4.4**: As the AI system, I provide responses that include clickable references to source documents so users can verify and explore further.
- **US 4.5**: As the AI system, I maintain conversation context to enable follow-up questions and deeper exploration of topics.
- **US 4.6**: As a Gyst user, I can click on document references in AI responses to immediately view the source material in the document viewer.

## Technical Requirements

### Frontend Architecture (Next.js)

- **Framework**: Next.js 15+ with TypeScript for type safety
- **UI Library**: React with modern hooks and functional components
- **Styling**: Tailwind CSS for responsive, utility-first styling
- **Document Rendering**:
  - react-pdf for PDF documents
  - react-markdown for Markdown files
  - Custom components for text and DOCX files
- **State Management**: React Context API or Zustand for application state
- **Authentication**: NextAuth V5 integration for secure session management

### Backend Architecture (Next.js API + Python FastAPI)

- **Next.js Backend**: API routes for database operations, file management, and service orchestration
- **Database**: SQLite with better-sqlite3 for high-performance local storage
- **Authentication**: NextAuth V5 with role-based access control
- **File Storage**: Local filesystem with secure hashed naming
- **AI Service**: Python FastAPI service with CrewAI framework integration

### AI & ML Architecture (Python FastAPI)

- **AI Framework**: CrewAI for agent orchestration and task management
- **LLM Provider**: Google Gemini 2.0 API for advanced language understanding
- **RAG Tools**: CrewAI specialized tools for different file types:
  - FileRAGTool for general file processing
  - PdfRagTool for PDF document analysis
  - DocxRagTool for Word document processing
  - TextRagTool for plain text analysis
- **Task Definition**: Custom CrewAI agents and tasks for tagging, chat, and correlation

### Database Schema Requirements

- **Users Management**: Comprehensive user table with role and organization association
- **Organization Isolation**: Organization table with proper foreign key relationships
- **Document Metadata**: Detailed document storage with file paths and metadata
- **Tag System**: Flexible tagging system with confidence scores and relationships
- **Performance**: Proper indexing for search and filtering operations

### Security Requirements

- **Authentication**: Secure password hashing and session management
- **Authorization**: Role-based access control enforced at API level
- **Data Isolation**: Organization-based filtering on all database queries
- **File Security**: Secure file upload with type validation and safe storage
- **Input Validation**: Comprehensive validation on all user inputs
- **Error Handling**: Secure error responses that don't leak sensitive information

### Performance Requirements

- **File Processing**: Documents up to 5MB processed within 120 seconds
- **Search Response**: Database searches complete within 4 seconds
- **AI Response Time**: Chat responses generated within 30 seconds
- **Concurrent Users**: Support for 5-10 concurrent users during demonstration
- **UI Responsiveness**: Interactive elements respond within 200ms

## User Interface Requirements

### Three-Panel Layout

- **Left Panel (File Explorer)**:
  - Organization-filtered document list
  - Search functionality with real-time filtering
  - Upload button (Admin only)
  - Tag-based filtering options

- **Center Panel (Document Viewer)**:
  - High-quality document rendering for all supported file types
  - Document tabs for multiple open documents
  - Tag display with confidence scores
  - Related document suggestions

- **Right Panel (AI Chat)**:
  - Conversation history with message persistence
  - Natural language input with rich text support
  - Document references as clickable links
  - Context indicators showing which documents AI is considering

### Key User Experience Requirements

- **Intuitive Navigation**: Clear visual hierarchy and logical information architecture
- **Responsive Design**: Functional across desktop and mobile devices
- **Accessibility**: WCAG 2.1 compliance for inclusive access
- **Loading States**: Clear feedback during AI processing and file operations
- **Error Handling**: User-friendly error messages with actionable guidance

## Success Metrics

### Functional Completeness

- 100% of essential user stories implemented and tested
- All supported file types (.txt, .md, .pdf, .docx) rendering correctly
- AI tag generation working with >80% relevance for test documents
- Search functionality returning accurate results within performance targets

### User Experience Quality

- Intuitive navigation with minimal learning curve
- Consistent AI response quality across different query types
- Responsive interface performance across target devices
- Comprehensive error handling with user-friendly messaging

### Technical Performance

- All performance targets met for file processing, search, and AI responses
- Secure authentication and authorization functioning correctly
- Organization-based data isolation verified through testing
- Database queries optimized for target response times

### Role-Based Functionality

- Admin users can successfully upload and manage documents
- User role restrictions properly enforced at UI and API levels
- Organization boundaries maintained for all data access
- Session management secure and reliable

### AI Capability Demonstration

- Tag generation produces relevant, contextual tags with confidence scores
- Chat interface provides accurate answers with proper source attribution
- Document correlation identifies meaningful relationships
- AI responses include properly formatted and functional document references

### Project Delivery Standards

- Codebase follows established coding standards and best practices
- Comprehensive documentation for setup, deployment, and usage
- Successful demonstration of core value proposition
- Architecture supports planned future enhancements
