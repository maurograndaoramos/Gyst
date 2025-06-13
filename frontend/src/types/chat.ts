/**
 * TypeScript interfaces for chat functionality - matches backend schemas exactly
 */

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system"
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO string
  metadata?: Record<string, any>;
}

export interface DocumentSource {
  document_path: string;
  relevance_score: number; // 0.0 to 1.0
  excerpt?: string;
  page_number?: number;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  organization_id?: string;
  user_id?: string;
  document_paths?: string[];
  max_documents?: number; // 1-20, default 5
  include_sources?: boolean; // default true
  stream?: boolean; // default false
  temperature?: number; // 0.0-1.0, default 0.7
}

export interface ChatResponse {
  conversation_id: string;
  message: ChatMessage;
  sources?: DocumentSource[];
  agent_process?: AgentStep[];
  processing_time_seconds?: number;
  token_usage?: Record<string, number>;
  follow_up_suggestions?: string[];
  created_at: string; // ISO string
}

export interface ChatStreamChunk {
  conversation_id: string;
  chunk_type: 'start' | 'content' | 'sources' | 'complete' | 'error';
  content?: string;
  sources?: DocumentSource[];
  metadata?: Record<string, any>;
  timestamp: string; // ISO string
}

export interface ChatErrorResponse {
  conversation_id?: string;
  error: string;
  message: string;
  details?: string;
  retry_after?: number;
  created_at: string; // ISO string
}

export interface ConversationSummary {
  conversation_id: string;
  message_count: number;
  start_time: string; // ISO string
  last_activity: string; // ISO string
  summary?: string;
  topics: string[];
}

export interface ChatHealth {
  status: string;
  conversation_memory_status: string;
  document_processing_status: string;
  active_conversations: number;
  uptime_seconds: number;
  last_check: string; // ISO string
}

// Extended types for frontend functionality
export interface DocumentContext {
  organizationId: string;
  selectedDocuments: string[];
  uploadedFiles: string[];
  relevanceThreshold: number;
}

export interface ConversationOptions {
  organizationId: string;
  userId: string;
  documentContext?: DocumentContext;
  preserveHistory?: boolean;
}

export interface ChatServiceConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  apiKey?: string;
}

// Error types for better error handling
export class ChatServiceError extends Error {
  constructor(
    message: string,
    public type: 'network' | 'api' | 'validation' | 'timeout' | 'circuit_breaker',
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

// Agent thought process types
export interface AgentStep {
  agent_name: string;
  agent_role: string;
  thought_process: string;
  timestamp: string;
  status: 'thinking' | 'completed' | 'active';
}

export interface EnhancedChatResponse {
  final_answer?: string;           // Main chat response
  agent_process?: AgentStep[];     // Thought process steps
  follow_up_suggestions?: string[];
  raw_response?: string;           // Fallback for current JSON responses
}

// Raw response parser for current backend format
export interface RawAgentResponse {
  question?: string;
  context?: string;
  coworker?: string;
  thought?: string;
  analysis?: string;
}

// Frontend-specific message interface (extends the backend one)
export interface FrontendMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status: 'delivered' | 'loading' | 'typing' | 'error' | 'processing';
  displayedText?: string;
  sources?: DocumentSource[];
  followUpSuggestions?: string[];
  conversationId?: string;
  agentProcess?: AgentStep[];      // Agent thinking steps
  rawResponse?: string;            // For debugging/fallback
  attachments?: import('@/types/mentions').AttachedDocument[]; // Document attachments
}

// Chat hook state interface
export interface ChatState {
  messages: FrontendMessage[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  conversationId: string | null;
  currentInput: string;
}

// Chat actions for state management
export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: FrontendMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: number; updates: Partial<FrontendMessage> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONVERSATION_ID'; payload: string }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'RESET_CONVERSATION' };
