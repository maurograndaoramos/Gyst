import { 
  EnhancedChatResponse, 
  RawAgentResponse, 
  AgentStep,
  ChatResponse 
} from '@/types/chat';

/**
 * Utility functions for parsing backend responses and extracting agent thought processes
 */

/**
 * Parse raw JSON response from backend into structured format
 */
export function parseAgentResponse(rawContent: string): EnhancedChatResponse {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(rawContent) as RawAgentResponse;
    
    // Extract agent information
    const agentStep: AgentStep = {
      agent_name: parsed.coworker || 'AI Assistant',
      agent_role: getAgentRole(parsed.coworker || 'AI Assistant'),
      thought_process: extractThoughtProcess(parsed),
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    // Try to extract final answer or use fallback
    const finalAnswer = extractFinalAnswer(parsed);

    return {
      final_answer: finalAnswer,
      agent_process: [agentStep],
      follow_up_suggestions: [], // Will be populated from other sources
      raw_response: rawContent
    };
  } catch (error) {
    // If parsing fails, treat as regular response
    return {
      final_answer: rawContent,
      agent_process: [],
      raw_response: rawContent
    };
  }
}

/**
 * Extract thought process from parsed response
 */
function extractThoughtProcess(parsed: RawAgentResponse): string {
  const parts: string[] = [];
  
  if (parsed.question) {
    parts.push(`Question: ${parsed.question}`);
  }
  
  if (parsed.context) {
    parts.push(`Context: ${parsed.context}`);
  }
  
  if (parsed.thought) {
    parts.push(`Thought: ${parsed.thought}`);
  }
  
  if (parsed.analysis) {
    parts.push(`Analysis: ${parsed.analysis}`);
  }
  
  return parts.join('\n\n') || 'Processing your request...';
}

/**
 * Try to extract a final answer from the response
 */
function extractFinalAnswer(parsed: RawAgentResponse): string | undefined {
  // Look for common patterns that indicate a final answer
  if (parsed.question && parsed.question.includes('should I respond')) {
    return "Yes, I'm here! How can I help you today?";
  }
  
  // If we can't extract a clear answer, return undefined
  // This will show the agent process instead
  return undefined;
}

/**
 * Get user-friendly agent role from agent name
 */
function getAgentRole(agentName: string): string {
  const roleMap: Record<string, string> = {
    'Document Context Specialist': 'Context Analysis',
    'Research Specialist': 'Information Research', 
    'Analysis Specialist': 'Data Analysis',
    'Response Specialist': 'Response Generation',
    'Quality Assurance Specialist': 'Quality Review',
    'AI Assistant': 'General Assistant'
  };
  
  return roleMap[agentName] || 'Specialist';
}

/**
 * Truncate text to specified number of lines
 */
export function truncateToLines(text: string, maxLines: number = 3): { truncated: string; hasMore: boolean } {
  const lines = text.split('\n');
  
  if (lines.length <= maxLines) {
    return {
      truncated: text,
      hasMore: false
    };
  }
  
  const truncatedLines = lines.slice(0, maxLines);
  return {
    truncated: truncatedLines.join('\n') + '...',
    hasMore: true
  };
}

/**
 * Enhanced response parser that handles both old and new format
 */
export function parseEnhancedChatResponse(response: ChatResponse): EnhancedChatResponse {
  const content = response.message.content;
  
  // Use the response content as the final answer directly
  // The backend now properly separates final_answer and agent_process
  return {
    final_answer: content, // Always use the message content as final answer
    agent_process: response.agent_process || [], // Use the separate agent_process field
    follow_up_suggestions: response.follow_up_suggestions || [],
    raw_response: content
  };
}

/**
 * Check if content looks like raw JSON agent response
 */
export function isAgentJsonResponse(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return !!(parsed.question || parsed.context || parsed.coworker);
  } catch {
    return false;
  }
}

/**
 * Create mock agent steps for demonstration/fallback
 */
export function createMockAgentSteps(content: string): AgentStep[] {
  return [
    {
      agent_name: 'Document Context Specialist',
      agent_role: 'Context Analysis',
      thought_process: `Analyzing the user's request: "${content}"\n\nI need to understand the context and determine the best way to help.`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    }
  ];
}
