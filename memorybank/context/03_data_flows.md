# Data Flows

## Document Upload Flow

This flow describes how a document is ingested into the system, stored, and automatically tagged using the CrewAI service. This action is restricted to users with the 'Admin' role.

1. **User Action (Frontend)**: An Admin user navigates to the upload section and selects a document file (.txt, .md, .pdf, .docx) in the Gyst Next.js frontend.

2. **Authentication Check (Frontend)**: The frontend verifies the user's role is 'Admin' before allowing upload initiation. Non-Admin users see upload functionality disabled.

3. **Upload Request (Frontend → Next.js Backend)**: The frontend sends an HTTP POST request containing the document file and basic information (original filename, file type) to the Next.js Backend Document API (/api/documents/upload).

4. **Role Verification (Next.js Backend)**: The backend verifies the user's session and confirms 'Admin' role using NextAuth V5 session data. Returns 403 error if user lacks permission.

5. **File Handling & Metadata Extraction (Next.js Backend)**:
   - The Next.js backend receives the file stream
   - Generates a SHA-256 hashed filename for secure storage
   - Saves the file to the local ./uploads directory using the hashed filename
   - Extracts basic metadata (file type, size, MIME type) from the uploaded file
   - Determines the local file path where the document was saved

6. **Database Record Creation (Next.js Backend → SQLite DB)**: The Next.js backend connects to the SQLite database (gyst.sqlite) and inserts a new record into the documents table. This record includes:
   - A unique document ID
   - The user ID of the uploader (Admin)
   - The organization ID (from user's session)
   - The hashed filename
   - The original filename
   - The relative file path in ./uploads
   - File type, size, and timestamp

7. **AI Tagging Request (Next.js Backend → Python FastAPI Service)**: The Next.js backend sends an HTTP POST request to the Python FastAPI service's /analyze_document endpoint. The request body includes:
   - The full local file path where the document is stored (./uploads/hashed_filename)
   - File type information
   - Organization ID for context

8. **Document Analysis (Python FastAPI Service)**:
   - The Python FastAPI service receives the request with the file path
   - Initializes a CrewAI task specifically designed for document analysis and tagging
   - The CrewAI task utilizes the appropriate RAG tool based on file type:
     - TextRagTool for .txt and .md files
     - PdfRagTool for .pdf files
     - DocxRagTool for .docx files
   - RAG tools read the content directly from the provided file path in the local ./uploads directory
   - CrewAI agents process the document content using Gemini 2.0 API, identifying key concepts, terms, and entities relevant for tagging

9. **Tags Generation (Python FastAPI Service)**: CrewAI generates a list of suggested tags based on its analysis, including confidence scores for each tag (0.0-1.0 scale).

10. **Tags Response (Python FastAPI Service → Next.js Backend)**: The Python FastAPI service returns the list of generated tags with confidence scores in the HTTP response body back to the Next.js backend.

11. **Database Tagging (Next.js Backend → SQLite DB)**:
    - The Next.js backend receives the list of suggested tags with confidence scores
    - For each suggested tag, it checks if the tag already exists in the tags table in the SQLite database. If not, it inserts the new tag
    - It then inserts records into the document_tags junction table, linking the newly uploaded document ID to the relevant tag IDs (including the AI's confidence score)

12. **Success Response (Next.js Backend → Frontend)**: The Next.js backend sends a success response back to the frontend, including the saved document's ID and the newly associated tags with their confidence scores.

13. **UI Update (Frontend)**: The frontend updates the file explorer to show the new document and displays the document with its automatically generated tags to the user.

## AI Chat Flow

This flow describes how a user interacts with the AI via the chat interface to query information across documents, leveraging CrewAI and RAG. This functionality is available to all authenticated users within an organization.

1. **User Action (Frontend)**: An authenticated user types a question or command into the Chat Interface in the Gyst Next.js frontend and sends it.

2. **Chat Request (Frontend → Next.js Backend)**: The frontend sends an HTTP POST request containing the user's query to the Next.js Backend Chat API (/api/chat).

3. **User Authentication & Context Gathering (Next.js Backend → SQLite DB)**: The Next.js backend:
   - Verifies the user's session using NextAuth V5
   - Retrieves the user's organization ID from the session
   - Performs a lightweight search or retrieval from the SQLite database (gyst.sqlite) to find potentially relevant documents. This could involve:
     - Identifying the currently viewed document's ID/path if the chat is context-aware
     - Performing a quick keyword search on document metadata (filename, tags) within the user's organization
     - Retrieving the file paths for potentially relevant documents from the documents table

4. **AI Chat Request (Next.js Backend → Python FastAPI Service)**: The Next.js backend sends an HTTP POST request to the Python FastAPI service's /chat endpoint. The request body includes:
   - The user's query string
   - A list of file paths for relevant documents identified in the previous step
   - User's organization ID for context
   - Optional: user role information for response customization

5. **Contextual Processing (Python FastAPI Service)**:
   - The Python FastAPI service receives the request, query, and list of file paths
   - Initializes a CrewAI task designed for conversational AI with document context
   - The CrewAI task uses the appropriate RAG tools to read and process content from the provided list of document file paths in ./uploads:
     - Multiple RAG tools may be used depending on the file types in the context list
     - TextRagTool for .txt/.md files, PdfRagTool for PDFs, DocxRagTool for Word documents
   - This allows the AI to understand the content of documents relevant to the query
   - CrewAI agents analyze the user's query in the context of the retrieved document content using Gemini 2.0 API

6. **Response Generation (Python FastAPI Service)**: CrewAI agents formulate a response based on their analysis, drawing information directly from the document content provided via RAG. The response includes:
   - Natural language answer to the user's query
   - References to the specific documents that were used
   - Confidence scores or relevance indicators for source materials

7. **AI Response (Python FastAPI Service → Next.js Backend)**: The Python FastAPI service returns the AI-generated response in the HTTP response body back to the Next.js backend. This response includes:
   - The main text response
   - A list of source document identifiers (file paths or document IDs)
   - Relevance scores for each source document
   - Processing metadata (time taken, confidence, etc.)

8. **Response Formatting & Document Reference Mapping (Next.js Backend → SQLite DB)**:
   - The Next.js backend receives the AI's text response and document references
   - It parses the response to identify document references based on the file paths provided by the Python service
   - For identified document references, it queries the SQLite database (gyst.sqlite) to retrieve corresponding metadata like the original filename, document ID, and organization verification
   - It formats the final response string for display in the chat interface, creating clickable links for document references
   - Ensures all referenced documents belong to the user's organization

9. **Display Response (Next.js Backend → Frontend)**: The Next.js backend sends the formatted AI response (including mapped document links with proper metadata) to the frontend.

10. **UI Update (Frontend)**: The frontend displays the AI's response in the chat interface, rendering document references as interactive links that can open the source documents in the main viewer panel.

11. **Document Link Interaction**: When a user clicks on a document link in the AI's response, it triggers the same document viewing process as selecting a document from the file explorer, opening the referenced document in the central viewer panel.

## Search Flow

This flow describes how users search for documents using text queries and tag-based filtering.

1. **Search Input (Frontend)**: User enters search terms in the search interface (search bar in file explorer or dedicated search component).

2. **Search Request (Frontend → Next.js Backend)**: Frontend sends HTTP GET request to /api/search with query parameters including search terms and any selected filters.

3. **Query Processing (Next.js Backend → SQLite DB)**:
   - Backend retrieves user's organization ID from session
   - Constructs SQLite query searching across documents and tags tables
   - Automatically filters results by organization ID
   - Searches in: original_filename, tags.name, and potentially document metadata
   - Orders results by relevance (tag matches, filename matches, recency)

4. **Results Formatting (Next.js Backend)**: Backend processes search results, including:
   - Document metadata retrieval
   - Associated tags for each document
   - Related document suggestions based on shared tags
   - Relevance scoring

5. **Search Response (Next.js Backend → Frontend)**: Backend returns formatted search results with document metadata, tags, and relevance scores.

6. **Results Display (Frontend)**: Frontend displays search results in the file explorer or dedicated results area, with options to open documents and view related files.

## Authentication Flow

This flow describes how users authenticate and gain access to organization-specific data.

1. **Login Request (Frontend)**: User submits credentials through login form (/login page).

2. **Authentication Processing (Next.js Backend)**: NextAuth V5 processes the login request:
   - Validates credentials against users table in SQLite database
   - Retrieves user role (Admin/User) and organization ID
   - Creates secure session with user metadata

3. **Session Establishment**: NextAuth V5 establishes session with:
   - User ID and username
   - Role information (Admin/User)
   - Organization ID for data filtering
   - Session expiration and security tokens

4. **Redirect to Application**: Successful authentication redirects user to /app with established session.

5. **Role-Based UI**: Frontend displays appropriate interface based on user role:
   - Admin users see upload functionality
   - All users see view, search, and chat functionality
   - All content filtered by user's organization

## Document Viewing Flow

This flow describes how users access and view documents from their organization.

1. **Document Selection (Frontend)**: User clicks on document in file explorer or search results.

2. **Access Request (Frontend → Next.js Backend)**: Frontend requests document content via /api/documents/[id]/content endpoint.

3. **Permission Verification (Next.js Backend)**:
   - Verifies user session and organization membership
   - Confirms document belongs to user's organization
   - Returns 403 error if access denied

4. **Content Retrieval (Next.js Backend)**:
   - Retrieves document metadata from SQLite database
   - Reads file content from ./uploads directory using stored file path
   - Retrieves associated tags for the document

5. **Content Response (Next.js Backend → Frontend)**: Backend returns document content, metadata, and tags.

6. **Document Rendering (Frontend)**: Frontend renders document using appropriate component:
   - react-pdf for PDF files
   - react-markdown for Markdown files
   - Plain text rendering for .txt files
   - Specialized handling for .docx files

7. **Tag Display**: Frontend displays associated tags below or alongside document content.

## Error Handling Flows

### Authentication Errors

- Invalid credentials → Login page with error message
- Expired session → Automatic redirect to login
- Insufficient permissions → 403 error with appropriate message

### File Upload Errors

- Unsupported file type → Frontend validation with user feedback
- File too large → Size validation with clear limits
- AI processing failure → Retry mechanism with manual tag option

### System Errors

- Database connection issues → Graceful degradation with user notification
- Python service unavailable → Queue requests or show maintenance message
- File corruption → Error handling with file re-upload option
