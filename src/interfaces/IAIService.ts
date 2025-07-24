import type { AIRequest, AIResponse } from '../types/index.js';

export interface AIProvider {
  name: string;
  models: string[];
  isAvailable(): Promise<boolean>;
  estimateCost(request: AIRequest): Promise<number>;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  tokensUsed?: number;
}

export interface JournalAnalysis {
  sentiment: number; // -1 to 1
  emotions: string[];
  themes: string[];
  suggestions: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    indicators: string[];
  };
}

export interface IAIService {
  // Text generation
  generateText(request: AIRequest): Promise<AIResponse>;
  generateTextStream(request: AIRequest): AsyncGenerator<StreamChunk>;
  
  // Journal analysis
  analyzeJournal(content: string, previousEntries?: string[]): Promise<JournalAnalysis>;
  generateJournalPrompts(mood?: string, recentTopics?: string[]): Promise<string[]>;
  
  // Mood insights
  analyzeMoodTrends(moodHistory: any[]): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    insights: string[];
    recommendations: string[];
  }>;
  
  // Wellness support
  generateWellnessAdvice(context: {
    mood: string;
    journalContent?: string;
    recentMoods?: any[];
  }): Promise<string[]>;
  
  // Additional methods implemented by GeminiAIService
  chatWithAI(message: string, context?: any): Promise<any>;
  analyzeJournalEntry(entry: any): Promise<any>;
  generateMoodInsights(moodHistory: any[]): Promise<any>;
  generateWellnessContent(type: string, userPreferences?: any): Promise<any>;
  healthCheck(): Promise<boolean>;
  
  // Provider management
  getAvailableProviders(): Promise<AIProvider[]>;
  switchProvider(providerName: string): Promise<void>;
  
  // Cost tracking
  getCostEstimate(request: AIRequest): Promise<number>;
  getUsageStats(userId: string, period: 'day' | 'week' | 'month'): Promise<{
    requests: number;
    tokensUsed: number;
    cost: number;
  }>;
}