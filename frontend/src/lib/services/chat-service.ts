import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { CircuitBreaker } from './circuit-breaker';
import { Logger } from './logger';
import {
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatErrorResponse,
  ConversationSummary,
  ChatHealth,
  ChatServiceConfig,
  ChatServiceError,
  DocumentContext,
  ConversationOptions,
  EnhancedChatResponse
} from '@/types/chat';
import { conversationManager } from '@/lib/utils/conversation-manager';
import { parseEnhancedChatResponse } from '@/lib/utils/response-parser';

/**
 * Main chat service for communicating with the Python backend
 */
export class ChatService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private logger: Logger;
  private config: ChatServiceConfig;

  constructor(config?: Partial<ChatServiceConfig>) {
    // Default configuration
    this.config = {
      baseUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
      timeout: parseInt(process.env.PYTHON_SERVICE_TIMEOUT || '30000'),
      maxRetries: parseInt(process.env.PYTHON_SERVICE_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.PYTHON_SERVICE_RETRY_DELAY || '1000'),
      apiKey: process.env.PYTHON_SERVICE_API_KEY,
      ...config
    };

    this.logger = new Logger('ChatService');
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
    });

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config: any) => {
        this.logger.info('Chat request', {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error: any) => {
        this.logger.error('Chat request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: any) => {
        this.logger.info('Chat response', {
          status: response.status,
          conversationId: response.data?.conversation_id,
        });
        return response;
      },
      (error: any) => {
        this.logger.error('Chat response error', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private transformError(error: any): ChatServiceError {
    if (error.code === 'ECONNABORTED') {
      return new ChatServiceError(
        'Request timeout - the server took too long to respond',
        'timeout',
        undefined,
        error
      );
    }

    if (!error.response) {
      return new ChatServiceError(
        'Network error - unable to connect to chat service',
        'network',
        undefined,
        error
      );
    }

    const status = error.response.status;
    const data = error.response.data as ChatErrorResponse;

    if (status >= 500) {
      return new ChatServiceError(
        data?.message || 'Internal server error',
        'api',
        status,
        data
      );
    }

    if (status === 422) {
      return new ChatServiceError(
        data?.message || 'Invalid request parameters',
        'validation',
        status,
        data
      );
    }

    return new ChatServiceError(
      data?.message || 'An error occurred',
      'api',
      status,
      data
    );
  }

  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        if (!this.circuitBreaker.isAvailable()) {
          throw new ChatServiceError(
            'Chat service is temporarily unavailable',
            'circuit_breaker'
          );
        }

        const response = await operation();
        this.circuitBreaker.onSuccess();
        return response.data;
      } catch (error) {
        lastError = error as Error;
        this.circuitBreaker.onFailure();

        this.logger.warn(`${operationName} attempt ${attempt + 1} failed`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
        });

        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          this.logger.info(`Retrying ${operationName} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new ChatServiceError('Max retries exceeded', 'network');
  }

  /**
   * Send a chat message and get a response
   */
  async sendMessage(
    message: string,
    options: ConversationOptions,
    documentPaths: string[] = []
  ): Promise<ChatResponse> {
    const conversationId = conversationManager.getConversationId(options);

    const request: ChatRequest = {
      message,
      conversation_id: conversationId,
      document_paths: documentPaths,
      max_documents: 5,
      include_sources: true,
      stream: false,
      temperature: 0.7,
    };

    return this.executeWithRetry(
      () => this.client.post<ChatResponse>('/api/chat/', request),
      'sendMessage'
    );
  }

  /**
   * Stream a chat message response
   */
  async *streamMessage(
    message: string,
    options: ConversationOptions,
    documentPaths: string[] = []
  ): AsyncGenerator<ChatStreamChunk, void, unknown> {
    const conversationId = conversationManager.getConversationId(options);

    const request: ChatRequest = {
      message,
      conversation_id: conversationId,
      document_paths: documentPaths,
      max_documents: 5,
      include_sources: true,
      stream: true,
      temperature: 0.7,
    };

    try {
      if (!this.circuitBreaker.isAvailable()) {
        throw new ChatServiceError(
          'Chat service is temporarily unavailable',
          'circuit_breaker'
        );
      }

      const response = await this.client.post('/api/chat/', request, {
        responseType: 'stream',
        headers: {
          'Accept': 'text/plain',
        },
      });

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const jsonData = line.substring(6).trim();
              const streamChunk: ChatStreamChunk = JSON.parse(jsonData);
              yield streamChunk;
            } catch (error) {
              this.logger.warn('Failed to parse stream chunk', { line, error });
            }
          }
        }
      }

      this.circuitBreaker.onSuccess();
    } catch (error) {
      this.circuitBreaker.onFailure();
      throw this.transformError(error);
    }
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(conversationId: string): Promise<ConversationSummary> {
    return this.executeWithRetry(
      () => this.client.get<ConversationSummary>(`/api/chat/conversations/${conversationId}/summary`),
      'getConversationSummary'
    );
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.executeWithRetry(
      () => this.client.delete(`/api/chat/conversations/${conversationId}`),
      'deleteConversation'
    );
  }

  /**
   * Reset conversation memory
   */
  async resetConversation(organizationId: string, userId: string): Promise<string> {
    // Reset locally first
    const newConversationId = conversationManager.resetConversation(organizationId, userId);
    
    try {
      // Optionally notify backend about conversation reset
      await this.executeWithRetry(
        () => this.client.post('/api/chat/conversations/reset-memory'),
        'resetConversation'
      );
    } catch (error) {
      this.logger.warn('Failed to reset conversation on backend', error);
      // Continue with local reset even if backend fails
    }

    return newConversationId;
  }

  /**
   * Get chat service health
   */
  async getHealth(): Promise<ChatHealth> {
    return this.executeWithRetry(
      () => this.client.get<ChatHealth>('/api/chat/health'),
      'getHealth'
    );
  }

  /**
   * Test connection to chat service
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      this.logger.error('Chat service connection test failed', error);
      return false;
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    isAvailable: boolean;
    failures: number;
    lastFailure?: Date;
  } {
    return {
      isAvailable: this.circuitBreaker.isAvailable(),
      failures: (this.circuitBreaker as any).failures || 0,
      lastFailure: (this.circuitBreaker as any).lastFailure,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    (this.circuitBreaker as any).failures = 0;
    (this.circuitBreaker as any).lastFailure = undefined;
  }

  /**
   * Create document context from file paths
   */
  createDocumentContext(
    organizationId: string,
    selectedFiles: string[] = [],
    uploadedFiles: string[] = []
  ): DocumentContext {
    return {
      organizationId,
      selectedDocuments: selectedFiles,
      uploadedFiles,
      relevanceThreshold: 0.7,
    };
  }

  /**
   * Prepare document paths for API request
   */
  prepareDocumentPaths(documentContext?: DocumentContext): string[] {
    if (!documentContext) return [];
    
    return [
      ...documentContext.selectedDocuments,
      ...documentContext.uploadedFiles,
    ].filter(Boolean);
  }
}

// Export singleton instance
let chatServiceInstance: ChatService | null = null;

export const getChatService = (): ChatService => {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatService();
  }
  return chatServiceInstance;
};

export const createChatService = (config?: Partial<ChatServiceConfig>): ChatService => {
  return new ChatService(config);
};
