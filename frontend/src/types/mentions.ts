export interface DocumentMention {
  id: string;
  name: string;
  title: string;
  filePath: string | null;
  type: 'document';
}

export interface TagMention {
  id: string;
  name: string;
  documentCount: number;
  type: 'tag';
}

export type Mention = DocumentMention | TagMention;

export interface MentionSearchResult {
  documents: DocumentMention[];
  tags: TagMention[];
}

export interface AttachedDocument {
  id: string;
  name: string;
  filePath: string | null;
  source: 'document' | 'tag'; // How it was attached
  tagName?: string; // If attached via tag, store the tag name
}

export interface MentionState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number } | null;
  selectedIndex: number;
  results: MentionSearchResult;
  attachedDocuments: AttachedDocument[];
}
