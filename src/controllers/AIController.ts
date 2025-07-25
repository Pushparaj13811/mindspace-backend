import { BaseController } from './BaseController.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';
import { 
  aiChatSchema, 
  aiAnalysisSchema, 
  aiInsightsQuerySchema 
} from '../utils/validation.js';
import type { User, JournalEntry, MoodEntry } from '../types/index.js';

/**
 * AI Controller
 * Handles all AI-related operations using the new service architecture
 */
export class AIController extends BaseController {

  async chatWithAI(context: any) {
    const { body, set } = context;

    try {
      const user = this.getCurrentUser(context);

      // Check permission for AI features
      await this.requirePermission(user, 'use_ai_features');

      this.logAction('ai_chat_request', user);

      // Validate request body
      const { message, includeContext = true } = this.validateRequestBody(aiChatSchema, body);

      let userContext;
      if (includeContext) {
        // Get recent user context for personalized responses
        try {
          // Get recent moods
          const moodQueries = [
            { field: 'userId', operator: 'equal' as const, value: user.$id }
          ];
          
          const recentMoods = await this.services.databaseService.list<MoodEntry>(
            'moods', 
            moodQueries
          );

          // Get recent journal entries
          const journalQueries = [
            { field: 'userId', operator: 'equal' as const, value: user.$id }
          ];
          
          const recentJournals = await this.services.databaseService.list<JournalEntry>(
            'journals', 
            journalQueries
          );

          userContext = {
            recentMoods: recentMoods.documents.slice(0, 5),
            recentJournals: recentJournals.documents.slice(0, 3)
          };
        } catch (error) {
          // Continue without context if we can't fetch it
          this.logAction('context_fetch_failed', user);
        }
      }

      const aiResponse = await this.services.aiService.chatWithAI(message, userContext);

      this.logAction('ai_chat_response', user, {
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
      this.logError(error as Error, 'ai_chat_request');
      return this.handleBusinessError(error as Error, set);
    }
  }

  async analyzeJournal(context: any) {
    const { body, set } = context;

    try {
      const user = this.getCurrentUser(context);

      // Check permission for AI features
      await this.requirePermission(user, 'use_ai_features');

      this.logAction('ai_journal_analysis_request', user);

      // Validate request body
      const { entryId } = this.validateRequestBody(aiAnalysisSchema, body);

      // Check resource access permission
      await this.requireResourceAccess(user, 'journal', entryId, 'view');

      // Get the journal entry
      const journalEntry = await this.services.databaseService.read<JournalEntry>('journals', entryId);

      const analysis = await this.services.aiService.analyzeJournalEntry(journalEntry);

      // Update the journal entry with AI insights
      try {
        await this.services.databaseService.update<JournalEntry>(
          'journals',
          entryId,
          { aiInsights: analysis }
        );
      } catch (updateError) {
        // Log but don't fail the request if we can't update
        this.logAction('ai_insights_update_failed', user, {
          entryId,
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }

      this.logAction('ai_journal_analysis_complete', user, {
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
      this.logError(error as Error, 'ai_journal_analysis_request');
      return this.handleBusinessError(error as Error, set);
    }
  }

  async getMoodInsights(context: any) {
    const { query, set } = context;

    try {
      const user = this.getCurrentUser(context);

      // Check permission for AI features
      await this.requirePermission(user, 'use_ai_features');

      this.logAction('ai_mood_insights_request', user);

      // Validate query parameters
      const queryParams = this.validateQueryParams(aiInsightsQuerySchema, query || {});
      const { period = '30d' } = queryParams;

      // Calculate date range and limit based on period
      const now = new Date();
      const dateFrom = new Date();
      let limit = 30;
      
      switch (period) {
        case '7d': 
          dateFrom.setDate(now.getDate() - 7);
          limit = 20; 
          break;
        case '90d': 
          dateFrom.setDate(now.getDate() - 90);
          limit = 180; 
          break;
        case '1y': 
          dateFrom.setFullYear(now.getFullYear() - 1);
          limit = 365; 
          break;
        default: // 30d
          dateFrom.setDate(now.getDate() - 30);
          limit = 60;
      }

      // Get mood history
      const moodQueries = [
        { field: 'userId', operator: 'equal' as const, value: user.$id },
        { field: '$createdAt', operator: 'greaterEqual' as const, value: dateFrom.toISOString() }
      ];
      
      const moodHistory = await this.services.databaseService.list<MoodEntry>('moods', moodQueries);

      const aiInsights = await this.services.aiService.generateMoodInsights(moodHistory.documents);

      this.logAction('ai_mood_insights_complete', user, {
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
      this.logError(error as Error, 'ai_mood_insights_request');
      return this.handleBusinessError(error as Error, set);
    }
  }

  async getWellnessContent(context: any) {
    const { query, set } = context;

    try {
      const user = this.getCurrentUser(context);

      // Check permission for AI features
      await this.requirePermission(user, 'use_ai_features');

      this.logAction('ai_wellness_content_request', user);

      const { type = 'daily_affirmation' } = query || {};

      const validTypes = ['daily_affirmation', 'mindfulness_tip', 'gratitude_prompt', 'breathing_exercise'];
      if (!validTypes.includes(type)) {
        throw new Error('Validation error: Invalid content type');
      }

      const userPreferences = {
        interests: user.preferences?.interests || []
      };

      const content = await this.services.aiService.generateWellnessContent(type, userPreferences);

      this.logAction('ai_wellness_content_generated', user, {
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
      this.logError(error as Error, 'ai_wellness_content_request');
      return this.handleBusinessError(error as Error, set);
    }
  }

  async getAICapabilities(context: any) {
    const { set } = context;

    try {
      const user = this.getCurrentUser(context);

      this.logAction('ai_capabilities_request', user);

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
      this.logError(error as Error, 'ai_capabilities_request');
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