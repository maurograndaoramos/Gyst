-- Add analysis-related fields to documents table
ALTER TABLE documents ADD COLUMN summary TEXT;
ALTER TABLE documents ADD COLUMN analysisStatus TEXT DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN analysisError TEXT;

-- Create index for faster queries on analysis status
CREATE INDEX idx_documents_analysis_status ON documents(analysisStatus);
