import { BaseController } from './BaseController.js';
import { moodLogSchema, paginationSchema, idParamSchema } from '../utils/validation.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';

/**
 * Mood Controller
 * Handles all mood tracking operations
 */
export class MoodController extends BaseController {
  
  /**
   * Log a new mood entry
   */
  async logMood(context: { 
    user?: any; 
    session?: string; 
    body: unknown; 
    set: any 
  }) {
    const { user, session, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('log_mood', authUser.$id);
      
      // Validate request body
      const validatedData = this.validateRequestBody(moodLogSchema, body);
      
      // Log mood through service
      const moodEntry = await this.services.databaseService.createMoodEntry({
        ...validatedData,
        userId: authUser.$id,
      });
      
      this.logAction('mood_logged', authUser.$id, { 
        moodId: moodEntry.id,
        mood: validatedData.current,
        intensity: validatedData.intensity 
      });
      
      set.status = HTTP_STATUS.CREATED;
      return this.success(
        { mood: moodEntry }, 
        SUCCESS_MESSAGES.MOOD_LOGGED, 
        HTTP_STATUS.CREATED
      );
      
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

  /**
   * Get mood history with pagination
   */
  async getMoodHistory(context: { 
    user?: any; 
    session?: string; 
    query?: unknown; 
    set: any 
  }) {
    const { user, session, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('get_mood_history', authUser.$id);
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(paginationSchema, query || {});
      
      // Get mood history through service
      const result = await this.services.databaseService.getMoodHistory(
        authUser.$id, 
        queryParams
      );
      
      this.logAction('mood_history_retrieved', authUser.$id, { 
        count: result.documents.length,
        total: result.total 
      });
      
      return this.success({
        moods: result.documents,
        pagination: {
          total: result.total,
          page: queryParams.page || 1,
          limit: queryParams.limit || 20,
          hasNext: ((queryParams.page || 1) * (queryParams.limit || 20)) < result.total,
          hasPrev: (queryParams.page || 1) > 1,
        }
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

  /**
   * Get mood insights and trends
   */
  async getMoodInsights(context: { 
    user?: any; 
    session?: string; 
    query?: unknown; 
    set: any 
  }) {
    const { user, session, query, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      this.logAction('get_mood_insights', authUser.$id);
      
      // Get recent mood history (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await this.services.databaseService.getMoodHistory(
        authUser.$id, 
        {
          limit: 100,
          dateFrom: thirtyDaysAgo.toISOString(),
        }
      );
      
      // Calculate basic insights
      const moods = result.documents;
      const insights = this.calculateMoodInsights(moods);
      
      this.logAction('mood_insights_calculated', authUser.$id, { 
        totalMoods: moods.length,
        trend: insights.trend 
      });
      
      return this.success({
        insights,
        period: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString(),
          totalEntries: moods.length,
        }
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

  /**
   * Update a mood entry
   */
  async updateMood(context: { 
    user?: any; 
    session?: string; 
    params: unknown; 
    body: unknown; 
    set: any 
  }) {
    const { user, session, params, body, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('update_mood', authUser.$id, { moodId: id });
      
      // Validate request body
      const validatedData = this.validateRequestBody(moodLogSchema, body);
      
      // Update mood through service
      const updatedMood = await this.services.databaseService.updateMoodEntry(
        id, 
        authUser.$id, 
        validatedData
      );
      
      this.logAction('mood_updated', authUser.$id, { moodId: id });
      
      return this.success(
        { mood: updatedMood }, 
        SUCCESS_MESSAGES.MOOD_UPDATED
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('Validation error')) {
          return this.handleValidationError(error, set);
        }
        if (error.message.includes('not found') || error.message.includes('Access denied')) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return this.error(ERROR_MESSAGES.MOOD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Delete a mood entry
   */
  async deleteMood(context: { 
    user?: any; 
    session?: string; 
    params: unknown; 
    set: any 
  }) {
    const { user, session, params, set } = context;
    
    try {
      const { user: authUser } = this.requireAuth(user, session, set);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('delete_mood', authUser.$id, { moodId: id });
      
      // Delete mood through service
      await this.services.databaseService.deleteMoodEntry(id, authUser.$id);
      
      this.logAction('mood_deleted', authUser.$id, { moodId: id });
      
      set.status = HTTP_STATUS.NO_CONTENT;
      return this.success(
        { message: 'Mood entry deleted successfully' },
        'Mood entry deleted successfully',
        HTTP_STATUS.NO_CONTENT
      );
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return this.handleAuthError(error, set);
        }
        if (error.message.includes('not found') || error.message.includes('Access denied')) {
          set.status = HTTP_STATUS.NOT_FOUND;
          return this.error(ERROR_MESSAGES.MOOD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
      }
      
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Calculate mood insights from mood history
   */
  private calculateMoodInsights(moods: any[]) {
    if (moods.length === 0) {
      return {
        trend: 'stable',
        averageIntensity: 0,
        mostCommonMood: null,
        moodDistribution: {},
        recommendations: ['Start logging your moods to get insights'],
      };
    }

    // Calculate average intensity
    const totalIntensity = moods.reduce((sum, mood) => sum + mood.intensity, 0);
    const averageIntensity = Math.round((totalIntensity / moods.length) * 10) / 10;

    // Calculate mood distribution
    const moodCounts = moods.reduce((counts, mood) => {
      counts[mood.current] = (counts[mood.current] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const mostCommonMood = Object.entries(moodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || null;

    // Calculate trend (simplified)
    const recentMoods = moods.slice(0, Math.min(7, moods.length));
    const olderMoods = moods.slice(7, Math.min(14, moods.length));
    
    let trend = 'stable';
    if (recentMoods.length > 0 && olderMoods.length > 0) {
      const recentAvg = recentMoods.reduce((sum, m) => sum + m.intensity, 0) / recentMoods.length;
      const olderAvg = olderMoods.reduce((sum, m) => sum + m.intensity, 0) / olderMoods.length;
      
      if (recentAvg > olderAvg + 0.5) trend = 'improving';
      else if (recentAvg < olderAvg - 0.5) trend = 'declining';
    }

    // Generate basic recommendations
    const recommendations = this.generateMoodRecommendations(
      averageIntensity,
      mostCommonMood,
      trend
    );

    return {
      trend,
      averageIntensity,
      mostCommonMood,
      moodDistribution: moodCounts,
      recommendations,
    };
  }

  /**
   * Generate mood-based recommendations
   */
  private generateMoodRecommendations(
    averageIntensity: number,
    mostCommonMood: string | null,
    trend: string
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'declining') {
      recommendations.push('Consider reaching out to a mental health professional');
      recommendations.push('Try incorporating relaxation techniques into your daily routine');
    } else if (trend === 'improving') {
      recommendations.push('Great progress! Keep up the positive habits');
    }

    if (averageIntensity < 4) {
      recommendations.push('Focus on activities that bring you joy');
      recommendations.push('Consider regular exercise to boost mood');
    }

    if (mostCommonMood === 'anxious') {
      recommendations.push('Try deep breathing exercises when feeling anxious');
      recommendations.push('Consider meditation or mindfulness practices');
    } else if (mostCommonMood === 'sad') {
      recommendations.push('Engage in social activities with friends and family');
      recommendations.push('Spend time outdoors when possible');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue tracking your moods to identify patterns');
      recommendations.push('Maintain a balanced lifestyle with good sleep and exercise');
    }

    return recommendations;
  }
}