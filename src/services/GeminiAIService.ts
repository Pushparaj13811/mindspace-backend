import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { IAIService, JournalInsights, MoodInsights } from '../core/interfaces/IAIService.js';
import type { AIRequest, AIResponse } from '../types/index.js';

export class GeminiAIService implements IAIService {
  private genAI: any;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.ai.geminiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    try {
      const { prompt, context } = request;
      logger.info('Generating AI response with Gemini', {
        promptLength: prompt.length,
        hasContext: !!context
      });

      let fullPrompt = prompt;
      if (context) {
        fullPrompt = `Context: ${context}\n\nUser: ${prompt}`;
      }

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      logger.info('Gemini response generated successfully', {
        responseLength: text.length
      });

      return {
        response: text,
        model: 'gemini-pro',
        tokensUsed: this.estimateTokens(fullPrompt + text),
        cost: 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to generate Gemini response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        promptPreview: (request.prompt || '').substring(0, 100) + '...'
      });
      throw new Error('Failed to generate AI response');
    }
  }

  async chat(message: string, context?: string): Promise<string> {
    const response = await this.generateResponse({ prompt: message, context });
    return response.response;
  }

  async analyzeJournalEntry(journalEntry: any): Promise<JournalInsights> {
    try {
      const prompt = `
        Analyze this journal entry and return JSON with sentiment (-1 to 1), emotions array, themes array, and suggestions array:
        
        Content: ${journalEntry.content}
        Mood: ${journalEntry.mood?.current} (${journalEntry.mood?.intensity}/10)
        
        Return only valid JSON.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        logger.warn('Failed to parse AI analysis as JSON');
      }

      return {
        sentiment: 0,
        emotions: ['neutral'],
        themes: ['general'],
        suggestions: ['Continue journaling regularly']
      };

    } catch (error) {
      logger.error('Failed to analyze journal entry', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        sentiment: 0,
        emotions: ['neutral'],
        themes: ['general'],
        suggestions: ['Continue journaling regularly']
      };
    }
  }

  async generateMoodInsights(moodData: any[]): Promise<MoodInsights> {
    try {
      if (!moodData || moodData.length === 0) {
        return {
          trends: { direction: 'stable', confidence: 0 },
          patterns: { bestTimes: [], worstTimes: [], triggers: [] },
          recommendations: ['Start logging moods regularly'],
          summary: 'Insufficient data for insights'
        };
      }

      const moodSummary = moodData.slice(0, 10).map(mood => 
        `${mood.current} (${mood.intensity}/10)`
      ).join(', ');

      const prompt = `
        Analyze the following mood data: ${moodSummary}
        
        Return JSON with: trends.direction (improving/stable/declining), trends.confidence (0-1), 
        patterns (bestTimes, worstTimes, triggers arrays), recommendations array, summary string.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        logger.warn('Failed to parse mood insights as JSON');
      }

      return {
        trends: { direction: 'stable', confidence: 0.5 },
        patterns: { bestTimes: [], worstTimes: [], triggers: [] },
        recommendations: ['Continue tracking moods'],
        summary: 'Building insights over time'
      };

    } catch (error) {
      logger.error('Failed to generate mood insights', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        trends: { direction: 'stable', confidence: 0 },
        patterns: { bestTimes: [], worstTimes: [], triggers: [] },
        recommendations: ['Continue tracking moods'],
        summary: 'Error generating insights'
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testResult = await this.model.generateContent('Test');
      const response = await testResult.response;
      const text = response.text();
      
      logger.info('Gemini AI service is available');
      return text.length > 0;
    } catch (error) {
      logger.error('Gemini AI service unavailable', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async chatWithAI(message: string, userContext?: any): Promise<{
    response: string;
    model: string;
    timestamp: string;
    contextUsed?: boolean;
  }> {
    try {
      let prompt = message;
      let contextUsed = false;

      if (userContext) {
        const contextStr = JSON.stringify(userContext);
        prompt = `Context: ${contextStr}\n\nUser message: ${message}`;
        contextUsed = true;
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return {
        response: response.text(),
        model: 'gemini-pro',
        timestamp: new Date().toISOString(),
        contextUsed
      };
    } catch (error) {
      logger.error('AI chat failed:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateWellnessContent(type: string, userPreferences?: any): Promise<{
    type: string;
    content: string;
    model: string;
    timestamp: string;
    fallback?: boolean;
  }> {
    try {
      const prompt = `Generate a ${type} for wellness. ${userPreferences ? `User preferences: ${JSON.stringify(userPreferences)}` : ''}`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return {
        type,
        content: response.text(),
        model: 'gemini-pro',
        timestamp: new Date().toISOString(),
        fallback: false
      };
    } catch (error) {
      logger.error('AI wellness content generation failed:', error);
      
      // Return fallback content
      return {
        type,
        content: `Here's a ${type} for you: Take a moment to breathe and center yourself.`,
        model: 'gemini-pro',
        timestamp: new Date().toISOString(),
        fallback: true
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.isAvailable();
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}