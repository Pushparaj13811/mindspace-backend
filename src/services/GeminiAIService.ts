import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { IAIService, AIProvider, StreamChunk, JournalAnalysis } from '../interfaces/IAIService.js';
import type { AIRequest, AIResponse } from '../types/index.js';

export class GeminiAIService implements IAIService {
  private genAI: any;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.ai.geminiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateResponse(prompt: string, context?: string): Promise<any> {
    try {
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
        cost: 0, // Gemini doesn't charge per token in the same way
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to generate Gemini response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prompt: prompt.substring(0, 100) + '...'
      });
      throw new Error('Failed to generate AI response');
    }
  }

  async analyzeJournalEntry(entry: any): Promise<any> {
    try {
      const prompt = `
        Please analyze this journal entry and provide insights in JSON format:

        Title: ${entry.title}
        Content: ${entry.content}
        Current Mood: ${entry.mood?.current} (intensity: ${entry.mood?.intensity}/10)
        
        Please provide:
        1. Sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
        2. Main emotions detected (array of emotions)
        3. Key themes (array of themes)
        4. Helpful suggestions (array of 2-3 suggestions for mental wellness)
        
        Respond only with valid JSON in this format:
        {
          "sentiment": 0.5,
          "emotions": ["happy", "grateful"],
          "themes": ["relationships", "personal growth"],
          "suggestions": ["Continue practicing gratitude", "Consider sharing positive experiences with others"]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          logger.info('Journal analysis completed', {
            entryId: entry.$id,
            sentiment: analysis.sentiment,
            emotionsCount: analysis.emotions?.length || 0,
            themesCount: analysis.themes?.length || 0
          });

          return analysis;
        }
      } catch (parseError) {
        logger.warn('Failed to parse AI analysis as JSON, returning raw response');
      }

      // Fallback if JSON parsing fails
      return {
        sentiment: 0,
        emotions: ['neutral'],
        themes: ['general'],
        suggestions: ['Continue journaling to track your mental wellness journey']
      };

    } catch (error) {
      logger.error('Failed to analyze journal entry', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entryId: entry.$id
      });
      
      // Return default analysis on error
      return {
        sentiment: 0,
        emotions: ['neutral'],
        themes: ['general'],
        suggestions: ['Continue journaling to track your mental wellness journey']
      };
    }
  }

  async generateMoodInsights(moodHistory: any[]): Promise<any> {
    try {
      if (!moodHistory || moodHistory.length === 0) {
        return {
          insights: ['Start logging your moods regularly to get personalized insights'],
          recommendations: ['Try to log your mood at the same time each day'],
          patterns: []
        };
      }

      const moodSummary = moodHistory.slice(0, 30).map(mood => 
        `${mood.current} (${mood.intensity}/10) - ${mood.notes || 'No notes'}`
      ).join('\n');

      const prompt = `
        Based on this mood history, provide insights in JSON format:

        Recent Moods:
        ${moodSummary}

        Please analyze and provide:
        1. Key insights about mood patterns (array of insights)
        2. Personalized recommendations (array of 3-4 recommendations)
        3. Identified patterns (array of patterns like "morning lows", "weekend highs", etc.)

        Respond only with valid JSON in this format:
        {
          "insights": ["You tend to feel more energetic in the evenings"],
          "recommendations": ["Try morning meditation", "Consider regular exercise"],
          "patterns": ["Higher energy on weekends", "Stress peaks on Mondays"]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const insights = JSON.parse(jsonMatch[0]);
          
          logger.info('Mood insights generated', {
            moodCount: moodHistory.length,
            insightsCount: insights.insights?.length || 0,
            recommendationsCount: insights.recommendations?.length || 0
          });

          return insights;
        }
      } catch (parseError) {
        logger.warn('Failed to parse mood insights as JSON');
      }

      // Fallback insights
      return {
        insights: ['Your mood data shows interesting patterns worth exploring'],
        recommendations: ['Continue tracking your mood regularly', 'Notice what affects your mood positively'],
        patterns: ['Building a consistent mood tracking habit']
      };

    } catch (error) {
      logger.error('Failed to generate mood insights', {
        error: error instanceof Error ? error.message : 'Unknown error',
        moodCount: moodHistory.length
      });

      return {
        insights: ['Continue mood tracking to build insights over time'],
        recommendations: ['Try to identify triggers that affect your mood'],
        patterns: ['Consistency in tracking helps identify patterns']
      };
    }
  }

  async chatWithAI(message: string, context?: any): Promise<any> {
    try {
      let systemPrompt = `You are MindSpace AI, a supportive mental wellness companion. You provide empathetic, helpful responses focused on mental health and wellness. Be encouraging, non-judgmental, and always suggest professional help when appropriate.`;

      if (context?.recentMoods) {
        systemPrompt += `\n\nUser's recent mood context: The user has been feeling mostly ${context.recentMoods[0]?.current || 'neutral'} lately.`;
      }

      if (context?.journalThemes) {
        systemPrompt += `\n\nRecent journal themes: ${context.journalThemes.join(', ')}`;
      }

      const fullPrompt = `${systemPrompt}\n\nUser message: ${message}`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      logger.info('AI chat response generated', {
        messageLength: message.length,
        responseLength: text.length,
        hasContext: !!context
      });

      return {
        response: text,
        model: 'gemini-pro',
        timestamp: new Date().toISOString(),
        contextUsed: !!context
      };

    } catch (error) {
      logger.error('Failed to generate chat response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: message.substring(0, 50) + '...'
      });

      return {
        response: "I'm sorry, I'm having trouble responding right now. Please try again in a moment, and remember that if you're experiencing urgent mental health concerns, please reach out to a mental health professional or crisis helpline.",
        model: 'gemini-pro',
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  async generateWellnessContent(type: string, userPreferences?: any): Promise<any> {
    try {
      let prompt = '';

      switch (type) {
        case 'daily_affirmation':
          prompt = 'Generate a positive, uplifting daily affirmation for mental wellness. Keep it personal and encouraging, around 1-2 sentences.';
          break;
        case 'mindfulness_tip':
          prompt = 'Provide a practical mindfulness tip that someone can use today. Make it actionable and specific, around 2-3 sentences.';
          break;
        case 'gratitude_prompt':
          prompt = 'Create a thoughtful gratitude journal prompt that helps someone reflect on positive aspects of their life. Make it engaging and specific.';
          break;
        case 'breathing_exercise':
          prompt = 'Describe a simple breathing exercise for stress relief or anxiety. Include step-by-step instructions that are easy to follow.';
          break;
        default:
          prompt = 'Generate helpful mental wellness content that promotes positive mental health.';
      }

      if (userPreferences?.interests) {
        prompt += `\n\nConsider these user interests: ${userPreferences.interests.join(', ')}`;
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.info('Wellness content generated', {
        type,
        contentLength: text.length
      });

      return {
        type,
        content: text,
        timestamp: new Date().toISOString(),
        model: 'gemini-pro'
      };

    } catch (error) {
      logger.error('Failed to generate wellness content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type
      });

      const fallbackContent: Record<string, string> = {
        daily_affirmation: "Today is a new opportunity to grow, learn, and take care of your mental wellness.",
        mindfulness_tip: "Take three deep breaths and notice how your body feels right now. This simple moment of awareness can help ground you in the present.",
        gratitude_prompt: "What's one small thing that happened today that made you smile or feel appreciated?",
        breathing_exercise: "Try the 4-7-8 technique: Breathe in for 4 counts, hold for 7, exhale for 8. Repeat 3-4 times."
      };

      return {
        type,
        content: fallbackContent[type] || fallbackContent.daily_affirmation,
        timestamp: new Date().toISOString(),
        model: 'gemini-pro',
        fallback: true
      };
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Interface method implementations
  async generateText(request: AIRequest): Promise<AIResponse> {
    return await this.generateResponse(request.prompt, request.context);
  }

  async *generateTextStream(request: AIRequest): AsyncGenerator<StreamChunk> {
    // For now, just return the full response as a single chunk
    // In the future, could implement true streaming
    const result = await this.generateText(request);
    yield {
      content: result.response,
      isComplete: true,
      tokensUsed: result.tokensUsed
    };
  }

  async analyzeJournal(content: string, previousEntries?: string[]): Promise<JournalAnalysis> {
    const analysis = await this.analyzeJournalEntry({ content, title: '', mood: null });
    return {
      sentiment: analysis.sentiment,
      emotions: analysis.emotions,
      themes: analysis.themes,
      suggestions: analysis.suggestions,
      riskAssessment: {
        level: 'low', // Could implement proper risk assessment
        indicators: []
      }
    };
  }

  async generateJournalPrompts(mood?: string, recentTopics?: string[]): Promise<string[]> {
    let prompt = 'Generate 3 thoughtful journal prompts for mental wellness reflection.';
    
    if (mood) {
      prompt += ` The user is currently feeling ${mood}.`;
    }
    
    if (recentTopics && recentTopics.length > 0) {
      prompt += ` Recent journal topics include: ${recentTopics.join(', ')}.`;
    }

    prompt += ' Return as a simple list, one prompt per line.';

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Split into lines and clean up
      const prompts = text.split('\n')
        .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter((line: string) => line.length > 10);
      
      return prompts.slice(0, 3);
    } catch (error) {
      return [
        'What emotions am I feeling right now, and what might be causing them?',
        'What is one thing I am grateful for today?',
        'How can I practice self-compassion in this moment?'
      ];
    }
  }

  async analyzeMoodTrends(moodHistory: any[]): Promise<any> {
    const insights = await this.generateMoodInsights(moodHistory);
    return {
      trend: 'stable', // Could implement proper trend analysis
      insights: insights.insights,
      recommendations: insights.recommendations
    };
  }

  async generateWellnessAdvice(context: any): Promise<string[]> {
    try {
      let prompt = `Provide 3 personalized wellness advice tips for someone feeling ${context.mood}.`;
      
      if (context.journalContent) {
        prompt += ` Based on their recent journal entry: "${context.journalContent.substring(0, 200)}..."`;
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const advice = text.split('\n')
        .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter((line: string) => line.length > 10);
      
      return advice.slice(0, 3);
    } catch (error) {
      return [
        'Take a few deep breaths and focus on the present moment',
        'Remember that feelings are temporary and will pass',
        'Consider reaching out to someone you trust for support'
      ];
    }
  }

  async getAvailableProviders(): Promise<AIProvider[]> {
    return [{
      name: 'Gemini',
      models: ['gemini-pro'],
      isAvailable: async () => await this.healthCheck(),
      estimateCost: async (request: AIRequest) => 0 // Gemini Pro is free tier
    }];
  }

  async switchProvider(providerName: string): Promise<void> {
    // Only Gemini supported for now
    if (providerName !== 'Gemini') {
      throw new Error('Only Gemini provider is currently supported');
    }
  }

  async getCostEstimate(request: AIRequest): Promise<number> {
    return 0; // Gemini Pro is free tier
  }

  async getUsageStats(userId: string, period: 'day' | 'week' | 'month'): Promise<any> {
    // Would need to implement usage tracking in a real system
    return {
      requests: 0,
      tokensUsed: 0,
      cost: 0
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testResult = await this.model.generateContent('Hello, are you working?');
      const response = await testResult.response;
      const text = response.text();
      
      logger.info('Gemini AI service health check passed');
      return text.length > 0;
    } catch (error) {
      logger.error('Gemini AI service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}