import { useReducer, useCallback, useEffect, useRef } from 'react';
import { getChatService } from '@/lib/services/chat-service';
import { conversationManager } from '@/lib/utils/conversation-manager';
import { parseEnhancedChatResponse } from '@/lib/utils/response-parser';
import {
  ChatState,
  ChatAction,
  FrontendMessage,
  ConversationOptions,
  DocumentContext,
  ChatServiceError,
  ChatResponse,
  MessageRole,
  EnhancedChatResponse
} from '@/types/chat';

// Initial state
const initialState: ChatState = {
  messages: [],
  isLoading: false,
  isTyping: false,
  error: null,
  conversationId: null,
  currentInput: '',
};

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_CONVERSATION_ID':
      return {
        ...state,
        conversationId: action.payload,
      };

    case 'SET_INPUT':
      return {
        ...state,
        currentInput: action.payload,
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      };

    case 'RESET_CONVERSATION':
      return {
        ...initialState,
        conversationId: null,
      };

    default:
      return state;
  }
}

// Convert backend ChatResponse to frontend message with enhanced parsing
function convertToFrontendMessage(
  response: ChatResponse,
  messageId: number
): FrontendMessage {
  // Parse the response to extract agent process and final answer
  const enhancedResponse = parseEnhancedChatResponse(response);
  
  return {
    id: messageId,
    text: enhancedResponse.final_answer || response.message.content,
    sender: 'ai',
    timestamp: new Date(),
    status: 'delivered',
    sources: response.sources,
    followUpSuggestions: enhancedResponse.follow_up_suggestions || response.follow_up_suggestions,
    conversationId: response.conversation_id,
    agentProcess: enhancedResponse.agent_process,
    rawResponse: enhancedResponse.raw_response,
  };
}

interface UseChatOptions {
  organizationId: string;
  userId: string;
  documentContext?: DocumentContext;
  preserveHistory?: boolean;
  autoInitialize?: boolean;
}

export function useChat(options: UseChatOptions) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const chatService = getChatService();
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdCounter = useRef(1);

  // Initialize conversation
  useEffect(() => {
    if (options.autoInitialize !== false) {
      conversationManager.initialize();
      
      const conversationOptions: ConversationOptions = {
        organizationId: options.organizationId,
        userId: options.userId,
        documentContext: options.documentContext,
        preserveHistory: options.preserveHistory ?? true,
      };

      const conversationId = conversationManager.getConversationId(conversationOptions);
      dispatch({ type: 'SET_CONVERSATION_ID', payload: conversationId });

      // Add initial welcome message if no history
      if (!conversationManager.hasConversation(options.organizationId, options.userId) || 
          !options.preserveHistory) {
        const welcomeMessage: FrontendMessage = {
          id: messageIdCounter.current++,
          text: "Hello! I'm your AI assistant. How can I help you today?",
          sender: 'ai',
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          status: 'delivered',
        };
        dispatch({ type: 'ADD_MESSAGE', payload: welcomeMessage });
      }
    }
  }, [options.organizationId, options.userId, options.preserveHistory, options.autoInitialize]);

  // Send message function with attachments support
  const sendMessage = useCallback(async (message: string, attachments?: import('@/types/mentions').AttachedDocument[]): Promise<void> => {
    if (!message.trim() || state.isLoading || state.isTyping) {
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: FrontendMessage = {
      id: messageIdCounter.current++,
      text: message.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'delivered',
      attachments: attachments || [],
    };

    // Add user message immediately
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_INPUT', payload: '' });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    // Add loading message
    const loadingMessage: FrontendMessage = {
      id: messageIdCounter.current++,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      status: 'loading',
    };
    dispatch({ type: 'ADD_MESSAGE', payload: loadingMessage });

    try {
      const conversationOptions: ConversationOptions = {
        organizationId: options.organizationId,
        userId: options.userId,
        documentContext: options.documentContext,
        preserveHistory: true,
      };

      // Prepare document paths from attachments and existing context
      let documentPaths = chatService.prepareDocumentPaths(options.documentContext);
      
      // Add attachment file paths
      if (attachments && attachments.length > 0) {
        const attachmentPaths = attachments
          .map(doc => doc.filePath)
          .filter((path): path is string => path !== null);
        documentPaths = [...documentPaths, ...attachmentPaths];
      }

      // Send message to backend
      const response = await chatService.sendMessage(
        message.trim(),
        conversationOptions,
        documentPaths
      );

      if (controller.signal.aborted) return;

      // Convert response to frontend message
      const aiMessage = convertToFrontendMessage(response, loadingMessage.id);
      aiMessage.status = 'typing'; // Start with typing status

      // Update loading message to typing message
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          id: loadingMessage.id,
          updates: aiMessage,
        },
      });

      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_TYPING', payload: true });
      dispatch({ type: 'SET_CONVERSATION_ID', payload: response.conversation_id });

    } catch (error) {
      if (controller.signal.aborted) return;

      console.error('Chat error:', error);

      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof ChatServiceError) {
        switch (error.type) {
          case 'network':
            errorMessage = 'Unable to connect to the chat service. Please check your connection.';
            break;
          case 'timeout':
            errorMessage = 'The request took too long. Please try again.';
            break;
          case 'circuit_breaker':
            errorMessage = 'The chat service is temporarily unavailable. Please try again in a moment.';
            break;
          case 'validation':
            errorMessage = 'Invalid message format. Please try rephrasing your question.';
            break;
          case 'api':
            errorMessage = error.message;
            break;
          default:
            errorMessage = error.message;
        }
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // Remove loading message on error
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          id: loadingMessage.id,
          updates: { status: 'error' },
        },
      });

      dispatch({ type: 'SET_LOADING', payload: false });
    } finally {
      abortControllerRef.current = null;
    }
  }, [state.isLoading, state.isTyping, options, chatService]);

  // Cancel current request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    dispatch({ type: 'SET_LOADING', payload: false });
    dispatch({ type: 'SET_TYPING', payload: false });
    
    // Remove any loading or typing messages
    const updatedMessages = state.messages.filter(
      msg => msg.status !== 'loading' && msg.status !== 'typing'
    );
    
    if (updatedMessages.length !== state.messages.length) {
      // If we filtered out messages, update the state
      dispatch({ type: 'CLEAR_MESSAGES' });
      updatedMessages.forEach(msg => {
        dispatch({ type: 'ADD_MESSAGE', payload: msg });
      });
    }
  }, [state.messages]);

  // Handle typing animation completion
  const handleTypingComplete = useCallback((messageId: number) => {
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: {
        id: messageId,
        updates: { status: 'delivered' },
      },
    });
    dispatch({ type: 'SET_TYPING', payload: false });
  }, []);

  // Reset conversation
  const resetConversation = useCallback(async () => {
    try {
      const newConversationId = await chatService.resetConversation(
        options.organizationId,
        options.userId
      );
      
      dispatch({ type: 'RESET_CONVERSATION' });
      dispatch({ type: 'SET_CONVERSATION_ID', payload: newConversationId });
      
      // Add welcome message
      const welcomeMessage: FrontendMessage = {
        id: messageIdCounter.current++,
        text: "Hello! I'm your AI assistant. How can I help you today?",
        sender: 'ai',
        timestamp: new Date(),
        status: 'delivered',
      };
      dispatch({ type: 'ADD_MESSAGE', payload: welcomeMessage });
      
    } catch (error) {
      console.error('Failed to reset conversation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to reset conversation. Please try again.' });
    }
  }, [chatService, options.organizationId, options.userId]);

  // Update input
  const updateInput = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', payload: value });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Test connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      return await chatService.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, [chatService]);

  // Get service status
  const getServiceStatus = useCallback(() => {
    return chatService.getCircuitBreakerStatus();
  }, [chatService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isTyping: state.isTyping,
    error: state.error,
    conversationId: state.conversationId,
    currentInput: state.currentInput,
    
    // Actions
    sendMessage,
    cancelRequest,
    handleTypingComplete,
    resetConversation,
    updateInput,
    clearError,
    testConnection,
    getServiceStatus,
    
    // Utilities
    messageCount: state.messages.length,
    hasConversation: state.messages.length > 1,
    canSendMessage: !state.isLoading && !state.isTyping && state.currentInput.trim().length > 0,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>;
