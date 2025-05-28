import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CircuitBreaker } from './circuit-breaker';
import { Logger } from './logger';

// API Contract Interfaces
export interface DocumentAnalysisRequest {
  filePath: string;
  fileType: string;
  organizationId: string;
}

export interface DocumentAnalysisResponse {
  tags: Array<{
    name: string;
    confidence: number;
  }>;
}

export interface ChatRequest {
  query: string;
  documentPaths: string[];
  organizationId: string;
  userRole?: string;
}

export interface ChatResponse {
  response: string;
  sourceDocuments: Array<{
    path: string;
    relevance: number;
  }>;
  metadata: {
    processingTime: number;
    confidence: number;
  };
}

export interface CorrelationRequest {
  documentPaths: string[];
  organizationId: string;
}

export interface CorrelationResponse {
  analysis: string;
  relationships: Array<{
    sourcePath: string;
    targetPath: string;
    relationshipType: string;
    confidence: number;
  }>;
}

// Service Configuration
interface PythonServiceConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  apiKey: string;
}

// Default configuration
const DEFAULT_CONFIG: PythonServiceConfig = {
  baseUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  apiKey: process.env.PYTHON_SERVICE_API_KEY || '',
};

export class PythonServiceConnector {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private logger: Logger;
  private config: PythonServiceConfig;

  constructor(config: Partial<PythonServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger('PythonServiceConnector');
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000, // 30 seconds
    });

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.info('Outgoing request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('Request error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.info('Incoming response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.logger.error('Response error', error);
        return Promise.reject(error);
      }
    );
  }

  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        if (!this.circuitBreaker.isAvailable()) {
          throw new Error('Circuit breaker is open');
        }

        const response = await operation();
        this.circuitBreaker.onSuccess();
        return response.data;
      } catch (error) {
        lastError = error as Error;
        this.circuitBreaker.onFailure();
        
        if (attempt < this.config.maxRetries - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResponse> {
    return this.executeWithRetry(() =>
      this.client.post<DocumentAnalysisResponse>('/analyze_document', request)
    );
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.executeWithRetry(() =>
      this.client.post<ChatResponse>('/chat', request)
    );
  }

  async correlate(request: CorrelationRequest): Promise<CorrelationResponse> {
    return this.executeWithRetry(() =>
      this.client.post<CorrelationResponse>('/correlate', request)
    );
  }
} 