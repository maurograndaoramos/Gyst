-- Enable FTS5 and create virtual table for document search
CREATE VIRTUAL TABLE documents_fts USING fts5(
  document_id UNINDEXED,
  filename,
  content,
  organizationId UNINDEXED
);

-- Populate the FTS table with existing documents
INSERT INTO documents_fts(document_id, filename, content, organizationId)
SELECT 
  d.id,
  COALESCE(d.originalFilename, d.title, ''),
  COALESCE(d.content, ''),
  d.organizationId
FROM document d;

-- Trigger to keep FTS table in sync when documents are inserted
CREATE TRIGGER documents_fts_insert AFTER INSERT ON document 
BEGIN
  INSERT INTO documents_fts(document_id, filename, content, organizationId) 
  VALUES (
    new.id, 
    COALESCE(new.originalFilename, new.title, ''), 
    COALESCE(new.content, ''),
    new.organizationId
  );
END;

-- Trigger to keep FTS table in sync when documents are updated
CREATE TRIGGER documents_fts_update AFTER UPDATE ON document 
BEGIN
  DELETE FROM documents_fts WHERE document_id = old.id;
  INSERT INTO documents_fts(document_id, filename, content, organizationId) 
  VALUES (
    new.id, 
    COALESCE(new.originalFilename, new.title, ''), 
    COALESCE(new.content, ''),
    new.organizationId
  );
END;

-- Trigger to keep FTS table in sync when documents are deleted
CREATE TRIGGER documents_fts_delete AFTER DELETE ON document 
BEGIN
  DELETE FROM documents_fts WHERE document_id = old.id;
END;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_org_created ON document(organizationId, createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_document_filename ON document(originalFilename);
CREATE INDEX IF NOT EXISTS idx_document_title ON document(title);
