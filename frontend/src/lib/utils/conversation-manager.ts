import { ConversationOptions } from '@/types/chat';

/**
 * Utility class for managing conversation IDs and session state
 */
export class ConversationManager {
  private static instance: ConversationManager;
  private conversationMap: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  /**
   * Generate a conversation ID for an organization and user
   * Format: {organizationId}_{userId}_{timestamp}
   */
  generateConversationId(organizationId: string, userId: string): string {
    const timestamp = Date.now();
    return `${organizationId}_${userId}_${timestamp}`;
  }

  /**
   * Get or create a conversation ID for a specific context
   */
  getConversationId(options: ConversationOptions): string {
    const contextKey = `${options.organizationId}_${options.userId}`;
    
    // If preserveHistory is false or no existing conversation, create new one
    if (!options.preserveHistory || !this.conversationMap.has(contextKey)) {
      const newConversationId = this.generateConversationId(
        options.organizationId, 
        options.userId
      );
      this.conversationMap.set(contextKey, newConversationId);
      return newConversationId;
    }

    return this.conversationMap.get(contextKey)!;
  }

  /**
   * Reset conversation for a specific context
   */
  resetConversation(organizationId: string, userId: string): string {
    const contextKey = `${organizationId}_${userId}`;
    const newConversationId = this.generateConversationId(organizationId, userId);
    this.conversationMap.set(contextKey, newConversationId);
    return newConversationId;
  }

  /**
   * Clear all conversations
   */
  clearAllConversations(): void {
    this.conversationMap.clear();
  }

  /**
   * Get all active conversation IDs
   */
  getActiveConversations(): string[] {
    return Array.from(this.conversationMap.values());
  }

  /**
   * Check if a conversation exists for a context
   */
  hasConversation(organizationId: string, userId: string): boolean {
    const contextKey = `${organizationId}_${userId}`;
    return this.conversationMap.has(contextKey);
  }

  /**
   * Remove a specific conversation
   */
  removeConversation(organizationId: string, userId: string): void {
    const contextKey = `${organizationId}_${userId}`;
    this.conversationMap.delete(contextKey);
  }

  /**
   * Get conversation context key
   */
  private getContextKey(organizationId: string, userId: string): string {
    return `${organizationId}_${userId}`;
  }

  /**
   * Serialize conversation state for persistence
   */
  serialize(): string {
    const data = Array.from(this.conversationMap.entries());
    return JSON.stringify(data);
  }

  /**
   * Deserialize conversation state from storage
   */
  deserialize(data: string): void {
    try {
      const entries = JSON.parse(data);
      this.conversationMap = new Map(entries);
    } catch (error) {
      console.warn('Failed to deserialize conversation state:', error);
      this.conversationMap.clear();
    }
  }

  /**
   * Save conversation state to localStorage
   */
  saveToStorage(): void {
    try {
      localStorage.setItem('gyst_conversations', this.serialize());
    } catch (error) {
      console.warn('Failed to save conversation state:', error);
    }
  }

  /**
   * Load conversation state from localStorage
   */
  loadFromStorage(): void {
    try {
      const data = localStorage.getItem('gyst_conversations');
      if (data) {
        this.deserialize(data);
      }
    } catch (error) {
      console.warn('Failed to load conversation state:', error);
    }
  }

  /**
   * Initialize conversation manager with storage
   */
  initialize(): void {
    this.loadFromStorage();
    
    // Save state on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }
}

// Export singleton instance
export const conversationManager = ConversationManager.getInstance();

/**
 * Helper functions for common operations
 */
export const conversationUtils = {
  /**
   * Create document context from dashboard state
   */
  createDocumentContext: (
    organizationId: string,
    selectedFiles: string[] = [],
    uploadedFiles: string[] = []
  ) => ({
    organizationId,
    selectedDocuments: selectedFiles,
    uploadedFiles,
    relevanceThreshold: 0.7, // Default relevance threshold
  }),

  /**
   * Validate conversation ID format
   */
  isValidConversationId: (conversationId: string): boolean => {
    const parts = conversationId.split('_');
    return parts.length === 3 && !isNaN(Number(parts[2]));
  },

  /**
   * Extract organization ID from conversation ID
   */
  getOrganizationFromConversationId: (conversationId: string): string | null => {
    const parts = conversationId.split('_');
    return parts.length === 3 ? parts[0] : null;
  },

  /**
   * Extract user ID from conversation ID
   */
  getUserFromConversationId: (conversationId: string): string | null => {
    const parts = conversationId.split('_');
    return parts.length === 3 ? parts[1] : null;
  },

  /**
   * Extract timestamp from conversation ID
   */
  getTimestampFromConversationId: (conversationId: string): number | null => {
    const parts = conversationId.split('_');
    return parts.length === 3 ? Number(parts[2]) : null;
  },

  /**
   * Get conversation age in minutes
   */
  getConversationAge: (conversationId: string): number | null => {
    const timestamp = conversationUtils.getTimestampFromConversationId(conversationId);
    return timestamp ? Math.floor((Date.now() - timestamp) / (1000 * 60)) : null;
  },

  /**
   * Check if conversation is expired (older than specified minutes)
   */
  isConversationExpired: (conversationId: string, maxAgeMinutes: number = 60): boolean => {
    const age = conversationUtils.getConversationAge(conversationId);
    return age !== null && age > maxAgeMinutes;
  }
};
