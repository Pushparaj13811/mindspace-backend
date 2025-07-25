import type { AIRequest, AIResponse } from '../../types/index.js';

/**
 * AI service interface for different AI providers
 */
export interface IAIService {
  /**
   * Generate a response from the AI model
   */
  generateResponse(request: AIRequest): Promise<AIResponse>;

  /**
   * Chat with the AI model (conversational)
   */
  chat(message: string, context?: string): Promise<string>;

  /**
   * Chat with AI using enhanced context
   */
  chatWithAI(message: string, userContext?: any): Promise<{
    response: string;
    model: string;
    timestamp: string;
    contextUsed?: boolean;
  }>;

  /**
   * Analyze journal entry for insights
   */
  analyzeJournalEntry(journalEntry: any): Promise<JournalInsights>;

  /**
   * Generate insights from mood data
   */
  generateMoodInsights(moodData: any[]): Promise<MoodInsights>;

  /**
   * Generate wellness content
   */
  generateWellnessContent(type: string, userPreferences?: any): Promise<{
    type: string;
    content: string;
    model: string;
    timestamp: string;
    fallback?: boolean;
  }>;

  /**
   * Check if the service is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Health check for the AI service
   */
  healthCheck(): Promise<boolean>;
}

export interface JournalInsights {
  sentiment: number; // -1 to 1
  emotions: string[];
  themes: string[];
  suggestions: string[];
  warnings?: string[];
}

export interface MoodInsights {
  trends: {
    direction: 'improving' | 'stable' | 'declining';
    confidence: number;
  };
  patterns: {
    bestTimes: string[];
    worstTimes: string[];
    triggers: string[];
  };
  recommendations: string[];
  summary: string;
  insights?: string[]; // Additional insights array used by the controller
}