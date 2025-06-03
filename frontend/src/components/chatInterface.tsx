import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, AlertCircle, User, Bot, Grip, X } from 'lucide-react';

// Types
interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status: 'delivered' | 'loading' | 'typing';
  displayedText?: string;
}

interface MessageBubbleProps {
  message: Message;
}

interface TypingTextProps {
  text: string;
  onComplete: () => void;
}

// Mock markdown renderer - replace with your preferred markdown library
const renderMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
    .replace(/\n/g, '<br>');
};

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you today?",
      sender: 'ai',
      timestamp: new Date(Date.now() - 300000),
      status: 'delivered'
    }
  ]);
  
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inputHeight, setInputHeight] = useState<number>(60);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [cancelController, setCancelController] = useState<AbortController | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  
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
  }, [inputValue, adjustTextareaHeight]);
  
  // Mock AI response function - replace with your WebSocket/API integration
  const sendToAI = async (message: string): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Simulate potential error
    if (Math.random() < 0.1) {
      throw new Error('Failed to get AI response. Please try again.');
    }
    
    const responses: string[] = [
      "That's an interesting question! Let me think about that for a moment...",
      "I understand what you're asking. Here's my perspective on this topic:",
      "Great point! This reminds me of a few key concepts I'd like to share:",
      "I can help you with that. Let me break this down into manageable parts:",
      "That's a complex topic with several important considerations:"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)] + 
           " This is a **sample response** with some *markdown* formatting and `code snippets` to demonstrate the rendering capabilities.";
  };
  
  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading || isTyping) return;
    
    const controller = new AbortController();
    setCancelController(controller);
    
    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      status: 'delivered'
    };
    
    // Optimistic update - add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    // Add loading message
    const loadingMessage: Message = {
      id: Date.now() + 1,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      status: 'loading'
    };
    
    setMessages(prev => [...prev, loadingMessage]);
    
    try {
      const aiResponse = await sendToAI(userMessage.text);
      
      if (controller.signal.aborted) return;
      
      // Replace loading message with typing message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? { ...msg, text: aiResponse, status: 'typing' as const }
          : msg
      ));
      setIsLoading(false);
      setIsTyping(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      // Remove loading message on error
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));
      setIsLoading(false);
      setCancelController(null);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isTyping) {
      e.preventDefault();
      void handleSendMessage();
    }
  };
  
  // Resize functionality
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = inputHeight;
    
    const handleMouseMove = (e: MouseEvent): void => {
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(60, Math.min(300, startHeight + deltaY));
      setInputHeight(newHeight);
    };
    
    const handleMouseUp = (): void => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const formatTimestamp = (timestamp: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  // Progressive text reveal component
  const TypingText: React.FC<TypingTextProps> = ({ text, onComplete }) => {
    const [displayedText, setDisplayedText] = useState<string>('');
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const textRef = useRef<string>(text);
    const isActiveRef = useRef<boolean>(true);
    
    useEffect(() => {
      textRef.current = text;
      setDisplayedText('');
      setCurrentIndex(0);
      isActiveRef.current = true;
    }, [text]);
    
    useEffect(() => {
      if (!isActiveRef.current) return;
      
      if (currentIndex < textRef.current.length) {
        const timer = setTimeout(() => {
          if (!isActiveRef.current) return;
          const nextChar = textRef.current[currentIndex];
          setDisplayedText(prev => prev + nextChar);
          setCurrentIndex(prev => prev + 1);
        }, 30 + Math.random() * 40);
        
        return () => clearTimeout(timer);
      } else if (currentIndex === textRef.current.length && textRef.current.length > 0) {
        onComplete();
      }
    }, [currentIndex, onComplete]);
    
    useEffect(() => {
      return () => {
        isActiveRef.current = false;
      };
    }, []);
    
    return (
      <div 
        dangerouslySetInnerHTML={{ 
          __html: renderMarkdown(displayedText) 
        }}
        className="text-sm leading-relaxed"
      />
    );
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInputValue(e.target.value);
  };
  
  const handleErrorDismiss = (): void => {
    setError(null);
  };

  const handleTypingComplete = (messageId: number): void => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status: 'delivered' as const }
        : msg
    ));
    setIsTyping(false);
    setCancelController(null);
  };

  const handleCancel = (): void => {
    if (cancelController) {
      cancelController.abort();
      setCancelController(null);
    }
    setIsLoading(false);
    setIsTyping(false);
    // Remove any loading or typing messages
    setMessages(prev => prev.filter(msg => msg.status !== 'loading' && msg.status !== 'typing'));
  };
  
  // Virtualized message rendering for performance
  const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => (
    <div className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                onComplete={() => handleTypingComplete(message.id)}
              />
              <div className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1"></div>
            </div>
          ) : (
            <div 
              dangerouslySetInnerHTML={{ 
                __html: renderMarkdown(message.text) 
              }}
              className="text-sm leading-relaxed"
            />
          )}
          <div className={`text-xs mt-1 opacity-70 ${
            message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatTimestamp(message.timestamp)}
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
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 b-none"
        style={{ paddingBottom: messages.length === 1 ? '200px' : '120px' }}
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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
      <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-center items-center p-6 rounded-md">
        {messages.length === 1 && (
          <p className="text-center text-2xl font-bold mb-8">How can I help?</p>
        )}
        <div className="relative w-full max-w-4xl">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="w-full pr-12 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[50px]"
            disabled={isLoading || isTyping}
            aria-label="Type your message"
            rows={1}
            style={{ height: 'auto', minHeight: '50px' }}
          />
          {(isLoading || isTyping) ? (
            <button
              onClick={handleCancel}
              className="absolute right-2 bottom-2 p-2 text-gray-500 hover:text-red-500 transition-colors hover:bg-red-50 rounded-full"
              type="button"
              aria-label="Cancel AI response"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => void handleSendMessage()}
              disabled={!inputValue.trim()}
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

export default ChatInterface;