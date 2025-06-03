import { NextRequest, NextResponse } from 'next/server';

// Helper to send SSE messages
function sendEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const fileId = formData.get('fileId') as string | null; // Expect a unique ID from the client for tracking

  if (!file || !fileId) {
    return NextResponse.json({ error: 'File and fileId are required' }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(':ok\n\n')); // Send a connection ack

      try {
        // Simulate file upload progress
        sendEvent(controller, { fileId, status: 'uploading', progress: 0 });
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
          sendEvent(controller, { fileId, status: 'uploading', progress: i });
          if (i === 100) {
             sendEvent(controller, { fileId, status: 'processing', progress: 100 });
          }
        }

        // Simulate AI processing
        // In a real scenario, this would involve calling the Python backend
        // and potentially receiving progress updates from it.
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate AI processing time
        
        // Simulate a possible error during AI processing for demonstration
        if (file.name.includes('error_example')) {
          throw new Error('AI processing failed for this file.');
        }

        sendEvent(controller, { fileId, status: 'completed', progress: 100 });

      } catch (error: any) {
        console.error(`Error processing file ${fileId}:`, error);
        sendEvent(controller, { fileId, status: 'error', errorMessage: error.message || 'An unknown error occurred' });
      } finally {
        controller.close();
      }
    },
    cancel(reason) {
      console.log(`Stream for file ${fileId} cancelled:`, reason);
      // TODO: Implement actual cancellation logic here
      // This might involve signaling another service to stop processing the file.
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

// Handle GET requests if needed, or OPTIONS for CORS preflight
export async function GET() {
  return NextResponse.json({ message: 'API is running. Use POST to upload files.' });
}
