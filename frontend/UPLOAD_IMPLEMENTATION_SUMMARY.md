# Upload Implementation Summary

This document summarizes the implementation of the file upload functionality with progress tracking.

## Components and API Routes

1.  **`frontend/src/components/UploadProgressModal.tsx`**
    *   **Purpose**: A reusable React client component that displays a modal for tracking the progress of multiple file uploads.
    *   **Features**:
        *   Shows individual progress bars, status (queued, uploading, processing, completed, error, cancelled), and error messages for each file.
        *   Provides "Cancel" and "Retry" buttons for each file.
        *   Manages its visibility via props.
    *   **Interface**: Exports `FileProgress` interface for defining the structure of file upload state.

2.  **`frontend/src/app/api/upload-progress/route.ts`**
    *   **Purpose**: A Next.js API Route Handler for managing file uploads and streaming progress updates.
    *   **Features**:
        *   Handles `POST` requests containing the file and a unique `fileId`.
        *   Uses Server-Sent Events (SSE) to stream real-time progress updates to the client (e.g., upload percentage, "processing with AI" status, completion, or errors).
        *   Simulates upload duration and AI processing time.
        *   Supports cancellation by detecting when the client closes the SSE connection.
    *   **Endpoint**: `POST /api/upload-progress`

3.  **`frontend/src/components/DocumentUploadClient.tsx`** (formerly `upload-example.tsx`)
    *   **Purpose**: A React client component that integrates file input with the `UploadProgressModal` and the `/api/upload-progress` API.
    *   **Features**:
        *   Allows users to select multiple files via an `<input type="file" multiple />`.
        *   For each selected file:
            *   Generates a unique `fileId`.
            *   Initiates an upload to `/api/upload-progress`.
            *   Establishes an `EventSource` connection to receive SSE updates for that file.
            *   Updates the local state (`FileProgress[]`) based on received events.
        *   Manages an array of `FileProgress` objects representing the state of all uploads.
        *   Controls the visibility of the `UploadProgressModal` and passes the necessary file data and callbacks (`onClose`, `onCancelFile`, `onRetryFile`) to it.
        *   Handles cancellation and retry logic by interacting with the `EventSource` and re-initiating uploads.

## Workflow

1.  User selects one or more files in `DocumentUploadClient.tsx`.
2.  For each file, a `FileProgress` object is created and added to the state.
3.  The `UploadProgressModal` is opened, displaying the files and their initial "queued" status.
4.  `DocumentUploadClient.tsx` initiates a `POST` request to `/api/upload-progress` for each file and simultaneously opens an `EventSource` connection to the same endpoint (or a related one designed for SSE if distinct) for that file.
5.  The `/api/upload-progress` route receives the file, starts processing it (simulated), and begins sending SSE messages back to the client with progress updates (e.g., `{ fileId: '...', status: 'uploading', progress: 20 }`).
6.  `DocumentUploadClient.tsx` receives these SSE messages via the `EventSource` and updates the corresponding `FileProgress` object in its state.
7.  The `UploadProgressModal` re-renders, reflecting the new progress and status for each file.
8.  If a user clicks "Cancel" for a file:
    *   `DocumentUploadClient.tsx` closes the `EventSource` for that file.
    *   The `/api/upload-progress` route's `ReadableStream` detects the cancellation and can stop further processing for that file.
    *   The file's status is updated to "cancelled" in the modal.
9.  If a user clicks "Retry" for a failed file:
    *   `DocumentUploadClient.tsx` re-initiates the upload process for that file (new `POST` and `EventSource`).
10. Once all files are processed (completed, errored, or cancelled), the user can close the modal.

## Key Technologies Used

*   Next.js App Router (Client Components, Route Handlers)
*   React (useState, useEffect, useRef)
*   Server-Sent Events (SSE) for real-time progress
*   `fetch` API for uploads
*   `EventSource` API for receiving SSE
*   FormData for sending files

## Notes

*   The "estimated time remaining" feature is part of the `FileProgress` interface but its calculation logic is not yet implemented in the current version.
*   The actual AI processing call to the Python backend is simulated in the API route and needs to be integrated.
*   Error handling for network issues and server errors is included.
*   The solution uses ShadCN UI components (`Card`, `Button`, `Input`) for the `DocumentUploadClient`'s basic structure. The modal itself uses basic inline styles for simplicity but can be styled further.
