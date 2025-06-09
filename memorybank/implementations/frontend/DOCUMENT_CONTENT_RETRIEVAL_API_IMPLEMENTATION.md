# Document Content Retrieval API Implementation

## Overview

This implementation provides a secure, high-performance document content retrieval API for the Gyst document management system. The API serves files based on stored paths with comprehensive security, caching, streaming, and audit logging capabilities.

## Architecture

### Core Components

1. **Main API Endpoint**: `/api/documents/[id]/content`
2. **File Service**: Secure file operations and streaming
3. **Audit Service**: Comprehensive logging and monitoring
4. **Test Endpoint**: `/api/test-document-content` for demonstration

## Implementation Details

### 1. Main API Endpoint (`/api/documents/[id]/content/route.ts`)

**Features Implemented:**
- ✅ **Permission verification**: Database lookup ensures user owns document within their organization
- ✅ **Content-type headers**: Automatic MIME type detection from database and file extension
- ✅ **Range request support**: Full HTTP 206 Partial Content support for PDFs and large files
- ✅ **Streaming for large files**: Memory-efficient streaming using Web API ReadableStream
- ✅ **Caching headers**: ETags, Last-Modified, Cache-Control, and conditional requests
- ✅ **Audit logging**: Comprehensive access tracking with IP, user agent, and bandwidth monitoring

**Security Features:**
- Path traversal protection
- Organization-based file isolation
- File existence verification
- Secure file path resolution
- Content-Type header validation
- Security headers (X-Content-Type-Options, X-Frame-Options)

**Performance Features:**
- ETags based on file size and modification time
- Conditional requests (304 Not Modified responses)
- Range requests for efficient PDF viewing
- Memory-efficient streaming for large files
- Proper cache headers for CDN compatibility

### 2. File Service (`/lib/services/file-service.ts`)

**Core Methods:**
```typescript
getSecureFilePath(filePath: string, organizationId: string): string
fileExists(filePath: string): Promise<boolean>
getContentType(mimeType: string | null, filename: string | null): string
createReadStream(filePath: string, start?: number, end?: number): Promise<ReadableStream>
sanitizeFilename(filename: string): string
calculateETag(filePath: string): Promise<string>
getFileStats(filePath: string): Promise<{size: number, modified: Date, created: Date}>
```

**Security Features:**
- Path traversal prevention (`../` removal)
- Organization directory enforcement
- File path validation
- Safe filename sanitization

**Streaming Implementation:**
- Converts Node.js ReadableStream to Web API ReadableStream
- Supports byte-range requests
- Handles backpressure properly
- Error handling and stream cleanup

### 3. Audit Service (`/lib/services/audit-service.ts`)

**Logging Capabilities:**
```typescript
logFileAccess(entry: FileAccessAuditEntry): Promise<void>
logDatabaseOperation(entry: AuditLogEntry): Promise<void>
logAuthEvent(userId: string, action: string, ...): Promise<void>
getFileAccessStats(organizationId: string, timeRange: string): Promise<Stats>
logBandwidthUsage(organizationId: string, userId: string, bytes: number): Promise<void>
```

**Audit Data Captured:**
- User ID and Organization ID
- Document ID and action type
- IP address and User Agent
- Bytes served and range requests
- Success/failure status
- Error messages
- Timestamp information

### 4. Database Integration

**File Storage Structure:**
```
uploads/
├── {organizationId}/
│   ├── {hashedFilename1}
│   ├── {hashedFilename2}
│   └── ...
```

**Database Schema Integration:**
- `documents` table with `filePath`, `originalFilename`, `mimeType`, `size`
- `auditLogs` table for comprehensive audit trails
- Organization-based isolation at database level

## API Usage Examples

### Basic File Request
```http
GET /api/documents/doc-123/content
Authorization: Bearer {token}
```

### Range Request (for PDF viewing)
```http
GET /api/documents/doc-123/content
Range: bytes=0-1023
Authorization: Bearer {token}
```

### Conditional Request (caching)
```http
GET /api/documents/doc-123/content
If-None-Match: "12345-1672531200000"
Authorization: Bearer {token}
```

## Response Headers

### Standard Response
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Length: 2048576
Accept-Ranges: bytes
ETag: "2048576-1672531200000"
Last-Modified: Sat, 31 Dec 2022 12:00:00 GMT
Cache-Control: private, max-age=3600
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Content-Disposition: inline; filename="document.pdf"
```

### Range Response
```http
HTTP/1.1 206 Partial Content
Content-Type: application/pdf
Content-Length: 1024
Content-Range: bytes 0-1023/2048576
Accept-Ranges: bytes
ETag: "2048576-1672531200000"
```

### Cache Hit Response
```http
HTTP/1.1 304 Not Modified
ETag: "2048576-1672531200000"
Last-Modified: Sat, 31 Dec 2022 12:00:00 GMT
```

## Security Considerations

### 1. Access Control
- Session-based authentication required
- Organization membership verification
- Document ownership validation
- No direct file system access

### 2. Path Security
- All file paths validated against organization boundaries
- Path traversal attacks prevented
- Filename sanitization for Content-Disposition headers
- No symbolic link following

### 3. Content Security
- MIME type validation
- Content-Type headers properly set
- Security headers added
- File size limits (configurable)

### 4. Audit Trail
- All access attempts logged
- Failed access attempts tracked
- IP addresses and user agents recorded
- Bandwidth usage monitored

## Performance Optimizations

### 1. Caching Strategy
- ETags for client-side caching
- Conditional requests support
- CDN-friendly headers
- 1-hour default cache duration

### 2. Streaming
- Memory-efficient file serving
- Support for large files (GB+)
- Range requests for bandwidth optimization
- Proper backpressure handling

### 3. Database Optimization
- Minimal database queries per request
- Indexed lookups on document ID and organization
- Audit logging doesn't block main response

## CDN Integration

The API is designed for seamless CDN integration:

### Headers for CDN
- `Cache-Control: private, max-age=3600`
- `ETag` for cache validation
- `Last-Modified` for conditional requests
- `Vary` headers when appropriate

### CDN Configuration Example
```nginx
# Nginx CDN configuration
location /api/documents/*/content {
    proxy_pass http://backend;
    proxy_cache_valid 200 1h;
    proxy_cache_valid 404 1m;
    proxy_cache_key $uri$is_args$args$http_authorization;
    proxy_cache_bypass $http_cache_control;
}
```

## Monitoring & Analytics

### 1. Metrics Collected
- File access frequency
- Bandwidth usage per organization
- Popular documents
- Error rates
- Response times

### 2. Audit Queries
```typescript
// Get organization file access stats
const stats = await auditService.getFileAccessStats('org-123', 'week')

// Get user audit trail
const logs = await auditService.getUserAuditLogs('user-456', 'org-123')

// Monitor bandwidth usage
await auditService.logBandwidthUsage('org-123', 'user-456', 1024000, 'DOWNLOAD')
```

## Testing

### Test Endpoint
A test endpoint `/api/test-document-content` is provided for demonstration:

```bash
# Test basic file serving
curl http://localhost:3000/api/test-document-content

# Test range requests
curl -H "Range: bytes=0-100" http://localhost:3000/api/test-document-content

# Test caching
curl -H "If-None-Match: \"123-456\"" http://localhost:3000/api/test-document-content
```

### Integration Tests
```typescript
// Example test cases needed:
// 1. Authentication/authorization
// 2. Range request handling
// 3. Caching behavior
// 4. Error handling
// 5. Audit logging
// 6. Security (path traversal, etc.)
```

## Error Handling

### Error Responses
```typescript
// 401 Unauthorized
{ error: 'Unauthorized' }

// 403 Forbidden
{ error: 'Organization access required' }

// 404 Not Found
{ error: 'Document not found' }

// 416 Range Not Satisfiable
{ error: 'Range not satisfiable' }

// 500 Internal Server Error
{ error: 'Internal server error' }
```

### Logging
All errors are logged with:
- Error message and stack trace
- User and organization context
- Request details (IP, User-Agent)
- Attempted operation details

## Future Enhancements

### 1. Additional Features
- File preview generation
- Thumbnail support for images
- Video streaming support
- Compression on-the-fly
- Watermarking

### 2. Performance
- Redis caching layer
- Background file processing
- CDN purge API integration
- Advanced compression (Brotli)

### 3. Security
- Content scanning integration
- DLP (Data Loss Prevention)
- Advanced rate limiting
- Geo-restriction support

### 4. Analytics
- Advanced analytics dashboard
- Usage reporting
- Cost optimization insights
- Performance monitoring

## Deployment Considerations

### 1. Environment Variables
```env
# File storage configuration
UPLOAD_BASE_DIR=/app/uploads
MAX_FILE_SIZE=100MB
CACHE_DURATION=3600

# Security
ENABLE_AUDIT_LOGGING=true
ENABLE_BANDWIDTH_MONITORING=true
```

### 2. File System
- Ensure adequate disk space
- Consider distributed file storage (AWS S3, etc.)
- Implement backup strategies
- Monitor disk usage

### 3. Scaling
- Multiple server instances supported
- Shared file storage required
- Database connection pooling
- Load balancer configuration

This implementation provides enterprise-grade document serving with comprehensive security, performance, and monitoring capabilities while maintaining clean, maintainable code architecture.
