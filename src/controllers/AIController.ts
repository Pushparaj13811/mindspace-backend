import { BaseController } from './BaseController.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';

export class AIController extends BaseController {

  constructor(services: any) {
    super(services);
  }

  async chatWithAI(context: any) {
    const { user, session, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('ai_chat_request', authUser.$id);
      
      const { message, includeContext = true } = body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new Error('Validation error: Message is required');
      }

      if (message.length > 4000) {
        throw new Error('Validation error: Message too long (max 4000 characters)');
      }

      let userContext;
      if (includeContext) {
        // Get recent user context for personalized responses
        try {
          const recentMoods = await this.services.databaseService.getMoodHistory(
            authUser.$id, 
            { limit: 5, sortOrder: 'desc' }
          );

          userContext = {
            recentMoods: recentMoods.documents,
            journalThemes: [] // Could add recent journal themes here
          };
        } catch (error) {
          // Continue without context if we can't fetch it
          this.logAction('context_fetch_failed', authUser.$id);
        }
      }

      const aiResponse = await this.services.aiService.chatWithAI(message, userContext);

      this.logAction('ai_chat_response', authUser.$id, {
        messageLength: message.length,
        responseLength: aiResponse.response.length,
        hasContext: !!userContext
      });

      return this.success({
        response: aiResponse.response,
        model: aiResponse.model,
        timestamp: aiResponse.timestamp,
        contextUsed: aiResponse.contextUsed || false
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  async analyzeJournal(context: any) {
    const { user, session, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('ai_journal_analysis_request', authUser.$id);
      
      const { entryId } = body;
      
      if (!entryId) {
        throw new Error('Validation error: Entry ID is required');
      }

      // Get the journal entry
      const journalEntry = await this.services.databaseService.getJournalEntry(
        entryId, 
        authUser.$id
      );

      if (!journalEntry) {
        set.status = HTTP_STATUS.NOT_FOUND;
        return this.error('Journal entry not found', HTTP_STATUS.NOT_FOUND);
      }

      const analysis = await this.services.aiService.analyzeJournalEntry(journalEntry);

      // Update the journal entry with AI insights
      try {
        await this.services.databaseService.updateJournalEntry(
          entryId,
          authUser.$id,
          { aiInsights: analysis }
        );
      } catch (updateError) {
        // Log but don't fail the request if we can't update
        this.logAction('ai_insights_update_failed', authUser.$id, {
          entryId,
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }

      this.logAction('ai_journal_analysis_complete', authUser.$id, {
        entryId,
        sentiment: analysis.sentiment,
        emotionsCount: analysis.emotions?.length || 0
      });

      return this.success({
        entryId,
        analysis: {
          sentiment: analysis.sentiment,
          emotions: analysis.emotions,
          themes: analysis.themes,
          suggestions: analysis.suggestions
        },
        model: 'gemini-pro',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  async getMoodInsights(context: any) {
    const { user, session, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('ai_mood_insights_request', authUser.$id);
      
      const { period = '30d' } = query || {};
      
      let limit = 30;
      switch (period) {
        case '7d': limit = 20; break;
        case '30d': limit = 60; break;
        case '90d': limit = 180; break;
        default: limit = 30;
      }

      // Get mood history
      const moodHistory = await this.services.databaseService.getMoodHistory(
        authUser.$id,
        { limit, sortOrder: 'desc' }
      );

      const aiInsights = await this.services.aiService.generateMoodInsights(moodHistory.documents);

      this.logAction('ai_mood_insights_complete', authUser.$id, {
        period,
        moodCount: moodHistory.documents.length,
        insightsCount: aiInsights.insights?.length || 0
      });

      return this.success({
        period,
        moodDataPoints: moodHistory.documents.length,
        insights: aiInsights.insights,
        recommendations: aiInsights.recommendations,
        patterns: aiInsights.patterns,
        model: 'gemini-pro',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  async getWellnessContent(context: any) {
    const { user, session, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('ai_wellness_content_request', authUser.$id);
      
      const { type = 'daily_affirmation' } = query || {};
      
      const validTypes = ['daily_affirmation', 'mindfulness_tip', 'gratitude_prompt', 'breathing_exercise'];
      if (!validTypes.includes(type)) {
        throw new Error('Validation error: Invalid content type');
      }

      const userPreferences = {
        interests: authUser.preferences?.interests || []
      };

      const content = await this.services.aiService.generateWellnessContent(type, userPreferences);

      this.logAction('ai_wellness_content_generated', authUser.$id, {
        type,
        contentLength: content.content.length
      });

      return this.success({
        type: content.type,
        content: content.content,
        model: content.model,
        timestamp: content.timestamp,
        personalized: !content.fallback
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  async getAICapabilities(context: any) {
    const { user, session, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('ai_capabilities_request', authUser.$id);

      return this.success({
        capabilities: {
          chat: {
            description: 'Interactive chat with AI wellness companion',
            features: ['Contextual responses', 'Mood-aware conversations', 'Wellness guidance']
          },
          journalAnalysis: {
            description: 'AI analysis of journal entries',
            features: ['Sentiment analysis', 'Emotion detection', 'Theme identification', 'Personalized suggestions']
          },
          moodInsights: {
            description: 'AI-powered mood pattern analysis',
            features: ['Pattern recognition', 'Trend analysis', 'Personalized recommendations']
          },
          wellnessContent: {
            description: 'AI-generated wellness content',
            types: ['daily_affirmation', 'mindfulness_tip', 'gratitude_prompt', 'breathing_exercise'],
            features: ['Personalized content', 'Daily variety', 'Evidence-based practices']
          }
        },
        model: 'gemini-pro',
        provider: 'Google AI',
        version: '1.0',
        rateLimits: {
          chat: '50 messages per hour',
          analysis: '20 analyses per hour',
          insights: '10 insights per hour',
          content: '30 content generations per hour'
        }
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Authentication required') {
        return this.handleAuthError(error, set);
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  async getAIHealth(context: any) {
    const { set } = context;
    
    try {
      const isHealthy = await this.services.aiService.healthCheck();
      
      if (isHealthy) {
        return this.success({
          status: 'healthy',
          model: 'gemini-pro',
          provider: 'Google AI',
          lastCheck: new Date().toISOString(),
          capabilities: ['chat', 'analysis', 'insights', 'content']
        });
      } else {
        set.status = HTTP_STATUS.SERVICE_UNAVAILABLE;
        return this.error('AI service is currently unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE);
      }

    } catch (error) {
      set.status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      return this.error('AI service health check failed', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
  }
}