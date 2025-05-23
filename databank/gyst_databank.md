# Gyst Project Databank

This document serves as a centralized databank for the Gyst project, summarizing key information from the project context and implementation guide.

## 1. Project Overview

### 1.1. Elevator Pitch
"Gyst is your team's AI-native documentation brain. It reads your internal docs like a codebase, automatically tags and cross-references them, and helps resolve issues faster through intelligent search and conversational AI—without anyone digging through folders. 'That's the Gyst of it'."

### 1.2. Core Capabilities
-   **Smart AI Tagging**: Automatically analyzes and tags incident reports, technical documentation, and troubleshooting guides using CrewAI framework with Google Gemini 2.0 API.
-   **Intelligent Pattern Recognition**: Uses sophisticated AI analysis to detect similar past issues and links directly to previous docs with confidence scoring and relevance ranking.
-   **Advanced Conversational Interface**: Teams can chat with Gyst using natural language; it responds by analyzing document content in real-time and pulling up relevant information with source attribution.
-   **Multi-Format Document Support**: Seamlessly handles .txt, .md, .pdf, and .docx files with specialized processing for each format.
-   **Role-Based Knowledge Management**: Supports different user roles (Admin for content management, User for consumption) within organizations.

### 1.3. Target Users
-   DevOps teams dealing with recurring infrastructure issues.
-   Support teams triaging technical problems.
-   Engineering organizations transforming tribal knowledge into searchable insights.
-   Technical teams where "didn't we deal with this already?" happens too often.
-   Organizations scaling rapidly who need to ensure knowledge retention.

## 2. System Architecture

### 2.1. Overview
Gyst employs a **Two-Tier Architecture**:
1.  **Next.js Application**: Handles frontend, backend API, user management, and database interaction.
2.  **Python FastAPI Service**: Leverages CrewAI framework with Gemini 2.0 API and RAG tools for AI-driven tasks.

### 2.2. Next.js Application Components

#### Frontend:
-   **AppComponent**: Main application container.
-   **FileExplorerComponent**: Displays folder/file structure.
-   **DocumentViewerComponent**: Renders .txt, .md, .pdf, .docx.
-   **ChatInterfaceComponent**: Handles AI agent interaction.
-   **SearchComponent**: Manages document and tag search.
-   **AuthComponents**: Handles user login, registration, role display (NextAuth V5).

#### Backend (API Routes):
-   **Auth API**: User authentication (NextAuth V5).
-   **Document API**: Upload, metadata, retrieval.
-   **Tag API**: Tag management.
-   **Search API**: Processes search requests.
-   **Chat API**: Handles chat interactions, forwards to Python service.
-   **Python Service Connector**: HTTP requests to Python FastAPI.
-   **Database Adapter**: Interacts with SQLite.

#### Key Libraries (Next.js):
-   Next.js 15+
-   NextAuth V5 (Beta)
-   React with TypeScript
-   react-pdf, react-markdown
-   Tailwind CSS
-   better-sqlite3

### 2.3. Python FastAPI Service Components

#### Key Endpoints:
-   **/analyze_document**: Triggers CrewAI for tagging.
-   **/chat**: Triggers CrewAI chat task.
-   **/correlate**: Triggers CrewAI for document correlation.

#### Core Functions:
-   **Crew Orchestrator**: Runs CrewAI tasks.
-   **RAG Tool Handler**: Configures FileRAGTool, DocxRagTool, PdfRagTool, TextRagTool.
-   **Tag Generation Task**: Extracts tags.
-   **Chat Response Task**: Generates conversational responses.
-   **Correlation Task**: Identifies relationships between documents.

#### Key Libraries (Python):
-   FastAPI
-   Pydantic
-   crewai, crewai_tools
-   Google Gemini 2.0 API integration
-   httpx

### 2.4. Database Schema (SQLite)

-   **users**: id, username, email, password_hash, role ('Admin'/'User'), organization_id, created_at.
-   **organizations**: id, name, created_at.
-   **documents**: id, organization_id, filename (hashed), original_filename, file_path, file_type, file_size, uploaded_by_user_id, created_at.
-   **tags**: id, name, created_at.
-   **document_tags**: id, document_id, tag_id, confidence, created_at.

### 2.5. File Storage
-   Base directory: `./uploads`
-   Filenames: SHA-256 hashed. Original names in DB.
-   Structure: Flat, potential for organization-based subdirectories.

### 2.6. Inter-Service Communication
-   RESTful APIs with JSON.
-   Next.js (client) <--> Python service (server).
-   Service-to-service authentication.

### 2.7. Security Considerations
-   NextAuth V5 (RBAC).
-   Input validation.
-   File type/size restrictions.
-   Restricted DB access.
-   Path security.
-   Organization-based data isolation.
-   Session management.

### 2.8. Performance Targets
-   Document Processing: < 120s for files up to 5MB.
-   Search Performance: < 4s.
-   AI Response Time: < 30s.
-   Concurrent Usage: 5-10 users.
-   File Upload: < 10s for typical files.

## 3. Data Flows

### 3.1. Document Upload Flow (Admin Only)
1.  Admin selects file (Frontend).
2.  Frontend verifies role.
3.  Upload to Next.js backend.
4.  Backend verifies session/role.
5.  File saved to `./uploads` (hashed name).
6.  DB record created.
7.  AI tagging request to Python service (file path).
8.  Python service analyzes (RAG tool).
9.  CrewAI generates tags (Gemini 2.0).
10. Tags returned to Next.js.
11. Tags stored in DB.
12. Success to frontend.
13. UI updates.

### 3.2. AI Chat Flow
1.  User types question (Frontend).
2.  Request to Next.js backend.
3.  Backend verifies session, gets org ID.
4.  Relevant documents identified (DB).
5.  Request to Python service (query, doc paths).
6.  Python service processes docs (RAG tools).
7.  CrewAI generates response (source attribution).
8.  Response to Next.js.
9.  Backend formats response.
10. Formatted response to frontend.
11. UI displays response.

### 3.3. Search Flow
1.  User enters search terms (Frontend).
2.  Request to Next.js backend.
3.  Backend constructs query (org filtering).
4.  Results from DB.
5.  Results formatted.
6.  Response to frontend.
7.  UI displays results.

### 3.4. Authentication Flow
1.  User submits credentials.
2.  NextAuth V5 validates (DB).
3.  Session created.
4.  User redirected.
5.  Role-based UI displayed.

### 3.5. Document Viewing Flow
1.  User selects document (Frontend).
2.  Frontend requests content (API).
3.  Backend verifies permissions.
4.  Content retrieved (file system).
5.  Response to frontend.
6.  Frontend renders.

## 4. UI Design

### 4.1. Layout: Three-Panel
-   **Left Panel (File Explorer)**: Search, Upload (Admin), Org/Role indicator, File tree, Tag filter.
-   **Center Panel (Document Viewer)**: Tabs, Header, Viewer area (PDF, MD, TXT, DOCX), Metadata, Related docs.
-   **Right Panel (AI Chat)**: Header, Context display, Chat history, Doc references, Input area, Suggested queries.

### 4.2. Visual Theme
-   Primary: Pink accent (#e91e63)
-   Secondary: Dark grey (#424242)
-   Background: Light grey (#f8f9fa)
-   Typography: Inter font
-   Code Font: JetBrains Mono

## 5. Project Scope (14-Day MVP)

### 5.1. In Scope
-   Document upload (.txt, .md, .pdf, .docx) - Admin only.
-   Local file storage (SHA-256 hashing).
-   Document viewing.
-   Automatic AI tag generation.
-   Tag-based document relationships.
-   Search (org filtering).
-   AI chat interface.
-   AI-assisted retrieval/correlation.
-   User authentication (Admin/User roles).
-   Organization-based data isolation.
-   Responsive three-panel interface.

### 5.2. Out of Scope
-   Hierarchical folder organization.
-   Document editing.
-   Manual tag management.
-   Advanced multi-tenancy.
-   Real-time collaboration.
-   External service integrations.
-   Version control.
-   Complex user management beyond Admin/User.

## 6. User Roles & Capabilities

### 6.1. Admin (Technical User)
-   Upload documents.
-   View all org documents.
-   Search documents.
-   Interact with AI chat.
-   Access correlation features.
-   View AI-generated tags.

### 6.2. User (Non-Technical User)
-   View all org documents.
-   Search documents.
-   Interact with AI chat.
-   Access correlation features.
-   (Cannot upload documents).

## 7. User Stories (Epics)

-   **Epic 1: User & Organization Management** (GYST-1 to GYST-11)
-   **Epic 2: Document Ingestion & AI Processing** (GYST-12 to GYST-24)
-   **Epic 3: Document Access & Discovery** (GYST-25 to GYST-34)
-   **Epic 4: AI-Powered Interaction & Analysis** (GYST-35 to GYST-44)
-   **Epic 5: System Polish & Deployment** (GYST-45 to GYST-52)

## 8. Technical Requirements Summary

### 8.1. Frontend
-   Next.js 15+ (TypeScript)
-   React (functional components)
-   Tailwind CSS
-   NextAuth V5
-   react-pdf, react-markdown

### 8.2. Backend
-   Next.js API routes
-   SQLite (better-sqlite3)
-   Python FastAPI service
-   CrewAI framework
-   Google Gemini 2.0 API

### 8.3. Security
-   Password hashing
-   RBAC
-   Org-based filtering
-   Input validation
-   Secure file handling

### 8.4. Performance
-   5MB file limit
-   120s processing timeout
-   4s search response
-   30s AI chat response
-   5-10 concurrent users

## 9. Success Metrics
-   100% essential user stories implemented.
-   All file types rendering correctly.
-   >80% AI tag relevance.
-   Performance targets met.
-   Secure authentication functioning.
-   Organization isolation verified.
-   AI capabilities demonstrated.

## 10. Git Workflow

When we take a card from Kanban, we then clone the project from Github. Then we move to the Dev branch and from there, we create a new branch. The branch should be named "feature/US<User story ID><name-of-the-feature>".
We then develop.
Once we are happy with the results, we push to remote with that new branch.
Our commits comments should reflect what's on branch name. So, "feature/US<User story ID><name-of-the-feature>" should have the following commit comment: "Feature: Adding This and That and doing so and so"
