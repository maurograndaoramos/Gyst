import React from 'react';
import { MessageCircle, ArrowRight, Lightbulb } from 'lucide-react';

interface EnhancedFollowUpSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  variant?: 'clickable' | 'informational';
  className?: string;
}

const EnhancedFollowUpSuggestions: React.FC<EnhancedFollowUpSuggestionsProps> = ({
  suggestions,
  onSuggestionClick,
  variant = 'informational',
  className = ''
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={`mt-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-medium text-gray-700">
          {variant === 'clickable' ? 'Suggested Questions' : 'Related Topics'}
        </h3>
      </div>

      {/* Suggestions Grid */}
      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`
              group relative overflow-hidden rounded-lg border transition-all duration-200
              ${variant === 'clickable' 
                ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:shadow-md cursor-pointer' 
                : 'border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100'
              }
            `}
            onClick={() => variant === 'clickable' && onSuggestionClick(suggestion)}
          >
            <div className="p-3">
              <div className="flex items-start space-x-3">
                {variant === 'clickable' ? (
                  <MessageCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${
                    variant === 'clickable' 
                      ? 'text-blue-800 group-hover:text-blue-900' 
                      : 'text-gray-700'
                  }`}>
                    {suggestion}
                  </p>
                </div>

                {variant === 'clickable' && (
                  <ArrowRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                )}
              </div>
            </div>

            {variant === 'clickable' && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 to-indigo-400/0 group-hover:from-blue-400/5 group-hover:to-indigo-400/5 transition-all duration-200"></div>
            )}
          </div>
        ))}
      </div>

      {/* Footer hint for clickable variant */}
      {variant === 'clickable' && (
        <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
          <MessageCircle className="w-3 h-3" />
          <span>Click any suggestion to ask about it</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedFollowUpSuggestions;
