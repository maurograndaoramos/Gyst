import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Send, AlertCircle, User, Bot, X, ExternalLink, FileText } from 'lucide-react';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';
import { useChat } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';
import { useParams } from 'next/navigation';
import { FrontendMessage, DocumentSource } from '@/types/chat';
import { useMentions } from '@/hooks/useMentions';
import { AttachedDocument } from '@/types/mentions';
import RotatingAgentThoughtProcess from './rotating-agent-thought-process';
import EnhancedFollowUpSuggestions from './enhanced-follow-up-suggestions';
import DocumentMentionDropup from './DocumentMentionDropup';
import AttachedDocumentsPreview from './AttachedDocumentsPreview';
import MessageAttachments from './MessageAttachments';

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

// Function to render styled input with highlighted mentions
const renderStyledInput = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Split text by mention pattern @[DocumentName]
  const mentionPattern = /@\[([^\]]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the styled mention
    parts.push(
      <span
        key={`mention-${match.index}`}
        className="inline-block bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md text-sm font-medium"
        style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
      >
        @{match[1]}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last mention
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
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

  // Initialize mentions hook
  const mentions = useMentions({
    organizationId,
    maxAttachments: 5,
    onAttachmentsChange: (attachments) => {
      // This will be used when sending messages
    }
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
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);
  
  useEffect(() => {
    adjustTextareaHeight();
  }, [currentInput, adjustTextareaHeight]);

  // Calculate cursor position for @ mentions
  const getCursorPosition = (): { top: number; left: number } | null => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    const rect = textarea.getBoundingClientRect();
    const textAreaStyle = window.getComputedStyle(textarea);
    const fontSize = parseInt(textAreaStyle.fontSize);
    const lineHeight = parseInt(textAreaStyle.lineHeight) || fontSize * 1.2;

    // Rough estimation of cursor position based on text length
    // For a more precise implementation, you might want to use a library
    const textBeforeCursor = currentInput.substring(0, textarea.selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[lines.length - 1].length;

    return {
      left: rect.left + (currentColumn * fontSize * 0.6), // Rough character width
      top: rect.top + (currentLine * lineHeight)
    };
  };

  // Enhanced input handling with @ detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    updateInput(newValue);

    // Check for @ mentions
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @ (indicating an active mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        const position = getCursorPosition();
        if (position) {
          mentions.openMentions(position, textAfterAt);
        }
      } else {
        mentions.closeMentions();
      }
    } else {
      mentions.closeMentions();
    }
  };

  // Enhanced keyboard handling for mentions
  const handleKeyPress = async (e: React.KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    if (mentions.isOpen) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          mentions.navigateSelection('down');
          break;
        case 'ArrowUp':
          e.preventDefault();
          mentions.navigateSelection('up');
          break;
        case 'Enter':
          e.preventDefault();
          await handleMentionSelect();
          break;
        case 'Escape':
          e.preventDefault();
          mentions.closeMentions();
          break;
        default:
          // Let other keys pass through for query update
          break;
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || (!e.shiftKey && canSendMessage))) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Handle mention selection and inline insertion
  const handleMentionSelect = async (): Promise<void> => {
    const result = await mentions.selectMention();
    if (!result) return;

    const { selectedMention } = result;
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Find the @ position and replace with inline mention
    const currentValue = currentInput;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Replace from @ to cursor position with inline mention
      const beforeAt = currentValue.substring(0, lastAtIndex);
      const afterCursor = currentValue.substring(cursorPosition);
      const mentionTag = `@[${selectedMention.name}]`;
      const newValue = beforeAt + mentionTag + afterCursor;
      
      updateInput(newValue);
      
      // Set cursor position after the mention tag
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + mentionTag.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };
  
  // Enhanced send message with attachments
  const handleSendMessage = async (): Promise<void> => {
    if (!canSendMessage) return;
    
    // Prepare message with attachments
    const messageWithAttachments = currentInput;
    const attachedDocuments = mentions.attachedDocuments;
    
    try {
      // Send message with attachments to backend
      await sendMessage(messageWithAttachments, attachedDocuments);
      
      // Clear attachments only after successful send
      mentions.clearAttachments();
    } catch (error) {
      // Don't clear attachments on error so user can retry
      console.error('Failed to send message:', error);
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
  
  // Message bubble component with agent process visualization and attachments
  const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onTypingComplete }) => (
    <div className={`mb-4 ${message.sender === 'user' ? 'flex justify-end' : 'block'}`}>
      {/* Show agent thought process for AI messages */}
      {message.sender === 'ai' && (message.status === 'loading' || message.status === 'processing' || (message.agentProcess && message.agentProcess.length > 0)) && (
        <div className="max-w-[85%] mb-3">
          <RotatingAgentThoughtProcess 
            agentSteps={message.agentProcess || []}
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
            {message.status === 'loading' && (!message.agentProcess || message.agentProcess.length === 0) ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-500">Initializing AI...</span>
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
                {/* Show attachments for user messages */}
                {message.sender === 'user' && message.attachments && message.attachments.length > 0 && (
                  <MessageAttachments attachments={message.attachments} />
                )}
                
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
      
      {/* Enhanced Input Area */}
      <div className="flex-shrink-0 flex flex-col justify-center items-center p-6 bg-gradient-to-t from-white to-gray-50/30">
        {messages.length <= 1 && (
          <div className="text-center mb-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">How can I help?</h2>
            <p className="text-gray-600 text-lg">Ask questions, get insights, or explore your documents</p>
          </div>
        )}
        
        <div className="relative w-full max-w-4xl">
          {/* Attached Documents Preview */}
          <AttachedDocumentsPreview
            attachments={mentions.attachedDocuments}
            onRemove={mentions.removeAttachment}
            maxAttachments={mentions.maxAttachments}
          />
          
          {/* Enhanced Text Input Container */}
          <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-200">
            {/* Input Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${isLoading || isTyping ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span>{isLoading || isTyping ? 'AI Processing...' : 'Ready to chat'}</span>
                </div>
                {mentions.hasAttachments && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {mentions.attachmentCount} document{mentions.attachmentCount > 1 ? 's' : ''} attached
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Ctrl + Enter to send</span>
                <span>•</span>
                <span>{currentInput.length} characters</span>
              </div>
            </div>

            {/* Enhanced Text Input with Styled Mentions */}
            <div className="relative min-h-[60px] max-h-[200px]">
              {/* Invisible overlay for styled mentions */}
              <div
                className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-4 py-4 text-transparent overflow-hidden"
                style={{
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  lineHeight: 'inherit',
                  zIndex: 1
                }}
              >
                {renderStyledInput(currentInput)}
              </div>
              
              <textarea
                ref={textareaRef}
                value={currentInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder={mentions.hasAttachments ? "Continue your message with attached documents..." : "Type your message... Use @ to mention documents"}
                className="w-full pr-16 resize-none border-0 rounded-none px-4 py-4 focus:outline-none bg-transparent text-base leading-relaxed min-h-[60px] max-h-[200px] relative z-10"
                disabled={isLoading || isTyping}
                aria-label="Type your message"
                rows={1}
                style={{ 
                  height: 'auto',
                  color: 'transparent',
                  caretColor: '#374151' // Gray-700 for visible cursor
                }}
              />
              
              {/* Visible text overlay */}
              <div
                className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words px-4 py-4 overflow-hidden"
                style={{
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  lineHeight: 'inherit',
                  zIndex: 5,
                  color: '#374151' // Gray-700
                }}
              >
                {renderStyledInput(currentInput)}
              </div>

              {/* Enhanced Send/Cancel Button */}
              <div className="absolute right-3 bottom-3">
                {(isLoading || isTyping) ? (
                  <button
                    onClick={cancelRequest}
                    className="p-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm border border-red-200"
                    type="button"
                    aria-label="Cancel AI response"
                  >
                    <X className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!canSendMessage}
                    className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-sm ${
                      canSendMessage 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    type="button"
                    aria-label="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Smart suggestions footer */}
            {!currentInput && !mentions.hasAttachments && messages.length <= 1 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
                <div className="flex flex-wrap gap-2">
                  {[
                    "What documents do I have?",
                    "Summarize my latest reports",
                    "Find insights about..."
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Document Mention Dropup */}
          <DocumentMentionDropup
            isOpen={mentions.isOpen}
            position={mentions.position}
            mentions={mentions.getAllMentions()}
            selectedIndex={mentions.selectedIndex}
            isLoading={mentions.isLoading}
            query={mentions.query}
            onSelect={mentions.selectMention}
            onClose={mentions.closeMentions}
          />
        </div>
      </div>
    </div>
  );
};

// Memoize the entire component to prevent re-renders from parent state changes
export default React.memo(ChatInterface);
