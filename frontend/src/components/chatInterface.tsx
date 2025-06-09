import React, { useRef, useEffect, useCallback } from 'react';
import { Send, AlertCircle, User, Bot, X, ExternalLink, FileText } from 'lucide-react';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';
import { useChat } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';
import { useParams } from 'next/navigation';
import { FrontendMessage, DocumentSource } from '@/types/chat';
import RotatingAgentThoughtProcess from './rotating-agent-thought-process';
import EnhancedFollowUpSuggestions from './enhanced-follow-up-suggestions';

interface MessageBubbleProps {
  message: FrontendMessage;
  onTypingComplete?: (messageId: number) => void;
}

interface TypingTextProps {
  text: string;
  onComplete: () => void;
}

interface SourceCitationProps {
  sources: DocumentSource[];
}

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

// Mock markdown renderer - replace with your preferred markdown library
const renderMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
    .replace(/\n/g, '<br>');
};

// Source citations component
const SourceCitations: React.FC<SourceCitationProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-gray-200">
      <div className="text-xs text-gray-500 mb-1">Sources:</div>
      <div className="space-y-1">
        {sources.map((source, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <FileText className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600 truncate">
              {source.document_path.split('/').pop()}
            </span>
            <span className="text-gray-400">
              ({Math.round(source.relevance_score * 100)}%)
            </span>
            {source.page_number && (
              <span className="text-gray-400">p.{source.page_number}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Follow-up suggestions component
const FollowUpSuggestions: React.FC<FollowUpSuggestionsProps> = ({ 
  suggestions, 
  onSuggestionClick 
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-gray-200">
      <div className="text-xs text-gray-500 mb-2">Suggested follow-ups:</div>
      <div className="space-y-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

const ChatInterface: React.FC = () => {
  const params = useParams();
  const { user } = useAuth();
  const organizationId = params.organizationId as string;
  
  // Initialize chat hook
  const {
    messages,
    isLoading,
    isTyping,
    error,
    currentInput,
    sendMessage,
    cancelRequest,
    handleTypingComplete,
    updateInput,
    clearError,
    canSendMessage
  } = useChat({
    organizationId,
    userId: user?.id || 'anonymous',
    preserveHistory: true,
    autoInitialize: true
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Auto-resize textarea
  const adjustTextareaHeight = useCallback((): void => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [currentInput, adjustTextareaHeight]);
  
  const handleSendMessage = async (): Promise<void> => {
    if (!canSendMessage) return;
    await sendMessage(currentInput);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && canSendMessage) {
      e.preventDefault();
      void handleSendMessage();
    }
  };
  
  const formatTimestamp = (timestamp: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  // Optimized progressive text reveal component using custom hook
  const TypingText: React.FC<TypingTextProps> = React.memo(({ text, onComplete }) => {
    const { displayedText, isAnimating } = useTypingAnimation({
      text,
      onComplete,
      speed: { min: 15, max: 35 } // Faster, more responsive speed
    });
    
    return (
      <div className="relative">
        <div 
          dangerouslySetInnerHTML={{ 
            __html: renderMarkdown(displayedText) 
          }}
          className="text-sm leading-relaxed"
        />
        {isAnimating && (
          <div className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1"></div>
        )}
      </div>
    );
  });

  // Add display name for TypingText component
  TypingText.displayName = 'TypingText';
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    updateInput(e.target.value);
  };
  
  const handleErrorDismiss = (): void => {
    clearError();
  };

  const handleSuggestionClick = (suggestion: string): void => {
    updateInput(suggestion);
    // Auto-focus textarea after setting suggestion
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };
  
  // Message bubble component with agent process visualization
  const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onTypingComplete }) => (
    <div className={`mb-4 ${message.sender === 'user' ? 'flex justify-end' : 'block'}`}>
      {/* Show agent thought process for AI messages */}
      {message.sender === 'ai' && message.agentProcess && message.agentProcess.length > 0 && (
        <div className="max-w-[85%] mb-3">
          <RotatingAgentThoughtProcess 
            agentSteps={message.agentProcess}
            isProcessing={message.status === 'loading' || message.status === 'processing'}
            rotationInterval={3000}
          />
        </div>
      )}
      
      <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            message.sender === 'user' ? 'bg-blue-500 ml-2' : 'bg-gray-500 mr-2'
          }`}>
            {message.sender === 'user' ? 
              <User className="w-4 h-4 text-white" /> : 
              <Bot className="w-4 h-4 text-white" />
            }
          </div>
          <div className={`rounded-lg px-4 py-2 ${
            message.sender === 'user' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            {message.status === 'loading' ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            ) : message.status === 'typing' ? (
              <div>
                <TypingText 
                  text={message.text} 
                  onComplete={() => onTypingComplete && onTypingComplete(message.id)}
                />
              </div>
            ) : message.status === 'error' ? (
              <div className="text-red-600">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                <span className="text-sm">Failed to get response. Please try again.</span>
              </div>
            ) : message.text ? (
              <div>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(message.text) 
                  }}
                  className="text-sm leading-relaxed"
                />
                {/* Show sources for AI messages */}
                {message.sender === 'ai' && message.sources && (
                  <SourceCitations sources={message.sources} />
                )}
                {/* Show follow-up suggestions for AI messages */}
                {message.sender === 'ai' && message.followUpSuggestions && (
                  <EnhancedFollowUpSuggestions 
                    suggestions={message.followUpSuggestions}
                    onSuggestionClick={handleSuggestionClick}
                    variant="informational"
                  />
                )}
              </div>
            ) : (
              // If no text but has agent process, show a minimal placeholder
              message.sender === 'ai' && message.agentProcess && message.agentProcess.length > 0 ? (
                <div className="text-sm text-gray-500 italic">
                  Processing complete - see analysis above
                </div>
              ) : null
            )}
            <div className={`text-xs mt-1 opacity-70 ${
              message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-h-full"
        style={{ paddingBottom: '20px' }}
      >
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            onTypingComplete={handleTypingComplete}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <button 
            onClick={handleErrorDismiss}
            className="ml-auto text-red-500 hover:text-red-700"
            type="button"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Input Area */}
      <div className="flex-shrink-0 flex flex-col justify-center items-center p-6">
        {messages.length <= 1 && (
          <p className="text-center text-2xl font-bold mb-8">How can I help?</p>
        )}
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            value={currentInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="shadow-lg w-full pr-12 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent min-h-[50px]"
            disabled={isLoading || isTyping}
            aria-label="Type your message"
            rows={1}
            style={{ height: 'auto', minHeight: '50px' }}
          />
          {(isLoading || isTyping) ? (
            <button
              onClick={cancelRequest}
              className="absolute right-2 bottom-2 p-2 text-gray-500 hover:text-red-500 transition-colors hover:bg-red-50 rounded-full"
              type="button"
              aria-label="Cancel AI response"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => void handleSendMessage()}
              disabled={!canSendMessage}
              className="absolute right-2 bottom-2 p-2 text-gray-500 hover:text-gray-700 transition-colors hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Memoize the entire component to prevent re-renders from parent state changes
export default React.memo(ChatInterface);
