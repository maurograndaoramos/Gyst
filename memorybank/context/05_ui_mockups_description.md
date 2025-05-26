# UI Mockups Description

This document provides detailed descriptions of the Gyst interface layout and components. These descriptions serve as a reference for implementation and can be converted to visual mockups as needed.

## Main Application Layout

```
┌─────────────────────┬───────────────────────────────────┬──────────────────┐
│ 🔍 Search           │ DOCUMENT TITLE                    │ GYST:            │
├─────────────────────┤                                   │                  │
│ 📁 Upload (Admin)   │ Document content rendering area:  │ Thanks for       │
│                     │                                   │ asking!          │
│ 📁 Folder          │ • PDF viewer with zoom/navigation │                  │
│ ├─📄 File.md       │ • Markdown with syntax             │ Based on the     │
│ ├─📄 Doc.pdf       │   highlighting                     │ incident         │
│ └─📁 Sub           │ • Plain text with formatting       │ report you       │
│   └─📄 Log.txt     │ • DOCX with proper formatting      │ shared,          │
│                     │                                   │ here's what...   │
│ 🏷️ Tags            │ Tags: [incident] [database]       │                  │
│ incident (5)        │       [troubleshoot]              │ [Type here...]   │
│ database (3)        │ Confidence: 0.95 0.87 0.82        │                  │
│ api (4)             │                                   │                  │
│                     │ Related Documents:                │                  │
│                     │ • Database Recovery Guide.pdf     │                  │
│                     │ • Previous Incident Report.md     │                  │
└─────────────────────┴───────────────────────────────────┴──────────────────┘
```

## Panel Descriptions

### Left Panel: File Explorer & Navigation

**Components:**

1. **Search Bar** - Top of panel, full-width
   - Placeholder: "Search documents..."
   - Real-time filtering as user types
   - Search across filenames, tags, and content
   - Clear search button (X) when active

2. **Upload Button** - Prominent button below search (Admin role only)
   - Text: "Upload Documents"
   - Drag-and-drop target area
   - File type indicators (.txt, .md, .pdf, .docx)
   - Progress indicator during upload

3. **Organization Indicator** - Shows current organization name
   - Small text showing "Organization: [Name]"
   - User role indicator (Admin/User)

4. **File Tree Structure** - Main content area
   - Hierarchical folder/file display
   - Expandable/collapsible folders with arrows (▸/▾)
   - File type icons:
     - 📄 for .txt files
     - Md icon for .md files
     - PDF icon for .pdf files
     - DOCX icon for .docx files
   - Hover effects for interactive feedback
   - Context menu on right-click (Open, Delete for Admins)

5. **Tag Filter Section** - Bottom of panel
   - "Filter by Tags" header
   - Clickable tag pills with document counts
   - Color-coded by frequency or confidence
   - Clear filters option

**Visual Style:**
- Width: 300px (resizable with drag handle)
- Background: Light grey (#f8f9fa)
- Clean icons and minimal visual noise
- Hover states for all interactive elements

### Center Panel: Document Viewer

**Components:**

1. **Document Tabs** - Top bar of viewer
   - Tab for each open document
   - Document icon + truncated filename
   - Close button (×) on each tab
   - Active tab highlighted
   - Overflow handling for many tabs

2. **Document Header** - Below tabs
   - Full document name
   - Upload date and file size
   - Uploaded by: [Username] (for attribution)
   - View count or last accessed (optional)

3. **Main Viewer Area** - Primary content display
   - **PDF Viewer**:
     - Zoom controls (fit-to-width, fit-to-page, custom zoom)
     - Page navigation (prev/next, page counter)
     - Search within document functionality
   - **Markdown Viewer**:
     - Rendered markdown with syntax highlighting
     - Code blocks with language detection
     - Table formatting and list styling
   - **Text Viewer**:
     - Clean typography with good line height
     - Syntax highlighting for recognized formats
     - Search and highlight functionality
   - **DOCX Viewer**:
     - Formatted document display
     - Preserve original styling and layout

4. **Document Metadata** - Below content
   - **AI-Generated Tags**: Displayed as colored pills
     - Tag name with confidence score
     - Tooltip showing confidence percentage
     - Click to filter other documents by tag
   - **File Information**: Size, type, upload date
   - **Processing Status**: "AI Analysis Complete" or "Processing..."

5. **Related Documents Section** - Right sidebar within viewer
   - "Documents you might find useful:" header
   - List of 3-5 related documents based on shared tags
   - Relevance score indicators
   - Click to open in new tab

**Visual Style:**
- Flexible width, fills remaining space
- Clean typography optimized for reading
- Consistent spacing and visual hierarchy
- Loading states for document processing

### Right Panel: AI Chat Interface

**Components:**

1. **Chat Header** - Top of panel
   - "GYST AI Assistant" title
   - Organization context indicator
   - Clear conversation button
   - Status indicator (online/processing)

2. **Context Display** - Below header (when active)
   - "Currently considering:" section
   - Mini thumbnails of documents in context
   - Option to add/remove documents from context
   - Context clarity indicator

3. **Chat History** - Main scrollable area
   - **User Messages**:
     - Right-aligned bubbles in blue (#007bff)
     - User avatar or initials
     - Timestamp on hover
   - **AI Responses**:
     - Left-aligned bubbles in light grey (#f1f3f4)
     - Gyst logo/avatar
     - Document references as inline links
     - Confidence indicators for answers
     - Timestamp on hover
   - **System Messages**:
     - Center-aligned, smaller text
     - "AI is analyzing documents..."
     - Processing indicators

4. **Document References in Responses**
   - Clickable document names in AI responses
   - Preview on hover showing document excerpt
   - Click to open document in center panel
   - Visual indicators for reference relevance

5. **Input Area** - Bottom of panel, fixed position
   - Multi-line text input with auto-expand
   - Placeholder: "Ask about your documents..."
   - Send button (always visible)
   - Character count for long messages
   - Attachment button to add specific documents to context
   - Voice input button (future enhancement)

6. **Suggested Queries** - Above input when chat is empty
   - "Try asking:" with example questions
   - "How do we handle database failures?"
   - "Show me recent incident reports"
   - "What's our deployment process?"

**Visual Style:**
- Width: 350px (resizable with drag handle)
- Chat bubbles with rounded corners
- Smooth animations for new messages
- Auto-scroll to latest message
- Loading indicators for AI processing

## Interactive Elements & Behaviors

### Document Upload Flow (Admin Only)

1. **Trigger Options**:
   - Click "Upload Documents" button
   - Drag files directly to file explorer
   - Drag files to entire application area

2. **Upload Interface**:
   - Modal dialog or expanded upload area
   - Drag-and-drop zone with visual feedback
   - File type validation with clear error messages
   - Multiple file selection support
   - File size limits clearly indicated

3. **Processing Flow**:
   - Upload progress bar for each file
   - "Analyzing with AI..." indicator
   - Real-time tag generation display
   - Success confirmation with generated tags
   - Automatic opening of uploaded document

### Search & Discovery Interactions

1. **Search Behavior**:
   - Real-time search results as user types
   - Search highlighting in results
   - Advanced search toggle for filters
   - Search history dropdown
   - Recent searches saved

2. **Filter Interactions**:
   - Click tag to filter document list
   - Multiple tag selection (AND/OR logic)
   - Date range filtering
   - File type filtering
   - Clear all filters option

3. **Document Discovery**:
   - "Related documents" automatic suggestions
   - "Users also viewed" recommendations
   - Tag-based document clustering visualization

### AI Chat Interactions

1. **Query Input**:
   - Auto-complete for common questions
   - Quick action buttons ("Summarize", "Find similar", "Explain")
   - Context suggestions based on current document
   - Rich text formatting in input (bold, italic, code)

2. **Response Interactions**:
   - Expandable sections for detailed explanations
   - "Show me more" buttons for deeper analysis
   - Copy response to clipboard
   - Rate response quality (thumbs up/down)
   - Follow-up question suggestions

3. **Context Management**:
   - Visual indicators for documents being considered
   - Manual context addition/removal
   - Context clarity settings (focused vs. broad)
   - Save conversation for later reference

### Authentication & Role-Based UI

1. **Login Flow**:
   - Clean login form with organization selection
   - "Remember me" option
   - Password reset functionality
   - Registration for new users with organization invitation

2. **Role Indicators**:
   - Clear role badges (Admin/User) in header
   - Different color schemes for role types
   - Feature availability indicators
   - Permission-based UI element visibility

3. **Organization Management**:
   - Organization name always visible
   - Switch organization option (if multi-org user)
   - Data isolation visual cues
   - Organization member count and activity

## Responsive Design Considerations

### Desktop Layout (>1200px)
- Full three-panel layout as described
- All features fully accessible
- Resizable panels with drag handles
- Keyboard shortcuts for power users

### Tablet Layout (768px - 1200px)
- Collapsible side panels with overlay behavior
- Chat panel becomes modal when activated
- Touch-friendly interface elements
- Swipe gestures for panel navigation

### Mobile Layout (<768px)
- Single panel view with bottom navigation
- Document viewer optimized for mobile reading
- Chat interface as full-screen overlay
- Touch-optimized file upload interface

## Visual Theme & Branding

### Color Palette
- **Primary**: Pink accent (#e91e63) for branding elements
- **Secondary**: Dark grey (#424242) for text and borders
- **Background**: Light grey (#f8f9fa) for panels and containers
- **Success**: Green (#28a745) for positive actions
- **Warning**: Orange (#fd7e14) for processing states
- **Error**: Red (#dc3545) for error states

### Typography
- **Primary Font**: Inter (clean, modern sans-serif)
- **Code Font**: JetBrains Mono for code blocks
- **Heading Scale**: Clear hierarchy with consistent spacing
- **Body Text**: Optimized for reading with proper line height

### Component Styling
- **Buttons**: Rounded corners, clear hover states
- **Input Fields**: Clean borders with focus states
- **Cards**: Subtle shadows and rounded corners
- **Tags**: Pill-shaped with color coding
- **Loading States**: Smooth animations and progress indicators
