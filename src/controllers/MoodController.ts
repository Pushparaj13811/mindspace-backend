import { BaseController } from './BaseController.js';
import { 
  moodLogSchema, 
  paginationSchema, 
  idParamSchema,
  moodQuerySchema 
} from '../utils/validation.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/response.js';
import type { User, MoodEntry, MoodQueryInput } from '../types/index.js';
import type { MoodLogInput } from '../utils/validation.js';
import type { DatabaseQuery } from '../core/interfaces/IDatabaseService.js';

/**
 * Mood Controller
 * Handles all mood tracking operations using the new service architecture
 */
export class MoodController extends BaseController {
  
  /**
   * Log a new mood entry
   */
  async logMood(context: any) {
    const { body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission using new permission system
      await this.requirePermission(user, 'create_journal');
      
      this.logAction('log_mood', user);
      
      // Validate request body
      const validatedData = this.validateRequestBody(moodLogSchema, body);
      
      // Create mood entry through database service (flattened for Appwrite)
      const moodData = {
        userId: user.$id,
        current: validatedData.current,
        intensity: validatedData.intensity,
        timestamp: validatedData.timestamp || new Date().toISOString(),
        triggers: validatedData.triggers || [],
        notes: validatedData.notes || '',
        // Additional optional fields (will be null/empty if not provided)
        location: validatedData.location || '',
        weather: validatedData.weather || '',
        activities: validatedData.activities || [],
        sleepQuality: validatedData.sleepQuality || null,
        stressLevel: validatedData.stressLevel || null,
        energyLevel: validatedData.energyLevel || null,
        socialInteraction: validatedData.socialInteraction || ''
      };
      
      const moodEntry = await this.services.databaseService.create<any>('moods', moodData);
      
      this.logAction('mood_logged', user, { 
        moodId: moodEntry.$id,
        mood: validatedData.current,
        intensity: validatedData.intensity 
      });
      
      // Transform flat data back to nested structure for API response
      const transformedMood = this.transformMoodToResponse(moodEntry);
      
      set.status = HTTP_STATUS.CREATED;
      return this.success(
        { mood: transformedMood }, 
        SUCCESS_MESSAGES.MOOD_LOGGED, 
        HTTP_STATUS.CREATED
      );
      
    } catch (error) {
      this.logError(error as Error, 'log_mood');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get mood history with pagination
   */
  async getMoodHistory(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission
      await this.requirePermission(user, 'view_own_data');
      
      this.logAction('get_mood_history', user);
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(moodQuerySchema as any, query || {}) as MoodQueryInput;
      const { page, limit } = this.parsePagination(queryParams.page, queryParams.limit);
      const { sortBy, sortOrder } = this.parseSort(queryParams.sortBy, queryParams.sortOrder);
      
      // Build database queries
      const queries: DatabaseQuery[] = [
        { field: 'userId', operator: 'equal', value: user.$id }
      ];
      
      if (queryParams.dateFrom) {
        queries.push({ field: '$createdAt', operator: 'greaterEqual', value: queryParams.dateFrom });
      }
      
      if (queryParams.dateTo) {
        queries.push({ field: '$createdAt', operator: 'lessEqual', value: queryParams.dateTo });
      }
      
      if (queryParams.mood) {
        queries.push({ field: 'current', operator: 'equal', value: queryParams.mood });
      }
      
      if (queryParams.minIntensity) {
        queries.push({ field: 'intensity', operator: 'greaterEqual', value: queryParams.minIntensity });
      }
      
      if (queryParams.maxIntensity) {
        queries.push({ field: 'intensity', operator: 'lessEqual', value: queryParams.maxIntensity });
      }
      
      // Get mood history through database service
      const result = await this.services.databaseService.list<MoodEntry>('moods', queries);
      
      this.logAction('mood_history_retrieved', user, { 
        count: result.documents.length,
        total: result.total 
      });
      
      // Transform flat data to nested structure for API response
      const transformedMoods = result.documents.map(mood => this.transformMoodToResponse(mood));
      
      return this.success({
        moods: transformedMoods,
        pagination: {
          total: result.total,
          page,
          limit,
          hasNext: (page * limit) < result.total,
          hasPrev: page > 1,
        }
      });
      
    } catch (error) {
      this.logError(error as Error, 'get_mood_history');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get mood insights and trends
   */
  async getMoodInsights(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check permission
      await this.requirePermission(user, 'view_own_data');
      
      this.logAction('get_mood_insights', user);
      
      // Parse query parameters for period
      const queryParams = this.validateQueryParams(moodQuerySchema as any, query || {}) as MoodQueryInput;
      const period = queryParams.period || '30d';
      
      // Calculate date range based on period
      const now = new Date();
      const dateFrom = new Date();
      
      switch (period) {
        case '7d':
          dateFrom.setDate(now.getDate() - 7);
          break;
        case '90d':
          dateFrom.setDate(now.getDate() - 90);
          break;
        case '1y':
          dateFrom.setFullYear(now.getFullYear() - 1);
          break;
        default: // 30d
          dateFrom.setDate(now.getDate() - 30);
      }
      
      // Get mood history for the period
      const queries: DatabaseQuery[] = [
        { field: 'userId', operator: 'equal', value: user.$id },
        { field: '$createdAt', operator: 'greaterEqual', value: dateFrom.toISOString() }
      ];
      
      const result = await this.services.databaseService.list<MoodEntry>('moods', queries);
      
      // Transform and calculate basic insights
      const transformedMoods = result.documents.map(mood => this.transformMoodToResponse(mood));
      const insights = this.calculateMoodInsights(transformedMoods);
      
      this.logAction('mood_insights_calculated', user, { 
        totalMoods: transformedMoods.length,
        trend: insights.trend,
        period 
      });
      
      return this.success({
        insights,
        period: {
          from: dateFrom.toISOString(),
          to: now.toISOString(),
          totalEntries: transformedMoods.length,
        }
      });
      
    } catch (error) {
      this.logError(error as Error, 'get_mood_insights');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Update a mood entry
   */
  async updateMood(context: any) {
    const { params, body, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('update_mood', user, { moodId: id });
      
      // Check resource access permission
      await this.requireResourceAccess(user, 'mood', id, 'update');
      
      // Validate request body
      const validatedData = this.validateRequestBody(moodLogSchema, body);
      
      // Update mood entry through database service (flattened for Appwrite)
      const updateData: any = {
        current: validatedData.current,
        intensity: validatedData.intensity,
        timestamp: validatedData.timestamp || new Date().toISOString(),
        triggers: validatedData.triggers || [],
        notes: validatedData.notes || '',
        // Additional optional fields (only update if provided)
        ...(validatedData.location !== undefined && { location: validatedData.location }),
        ...(validatedData.weather !== undefined && { weather: validatedData.weather }),
        ...(validatedData.activities !== undefined && { activities: validatedData.activities }),
        ...(validatedData.sleepQuality !== undefined && { sleepQuality: validatedData.sleepQuality }),
        ...(validatedData.stressLevel !== undefined && { stressLevel: validatedData.stressLevel }),
        ...(validatedData.energyLevel !== undefined && { energyLevel: validatedData.energyLevel }),
        ...(validatedData.socialInteraction !== undefined && { socialInteraction: validatedData.socialInteraction })
      };
      
      const updatedMood = await this.services.databaseService.update<any>('moods', id, updateData);
      
      this.logAction('mood_updated', user, { moodId: id });
      
      // Transform flat data back to nested structure for API response
      const transformedMood = this.transformMoodToResponse(updatedMood);
      
      return this.success(
        { mood: transformedMood }, 
        SUCCESS_MESSAGES.MOOD_UPDATED
      );
      
    } catch (error) {
      this.logError(error as Error, 'update_mood');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Delete a mood entry
   */
  async deleteMood(context: any) {
    const { params, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Validate URL parameters
      const { id } = this.validateUrlParams(idParamSchema, params);
      
      this.logAction('delete_mood', user, { moodId: id });
      
      // Check resource access permission
      await this.requireResourceAccess(user, 'mood', id, 'delete');
      
      // Delete mood entry through database service
      await this.services.databaseService.delete('moods', id);
      
      this.logAction('mood_deleted', user, { moodId: id });
      
      set.status = HTTP_STATUS.NO_CONTENT;
      return this.success(
        { message: 'Mood entry deleted successfully' },
        'Mood entry deleted successfully',
        HTTP_STATUS.NO_CONTENT
      );
      
    } catch (error) {
      this.logError(error as Error, 'delete_mood');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Get mood analytics for administrators
   */
  async getMoodAnalyticsAdmin(context: any) {
    const { query, set } = context;
    
    try {
      const user = this.getCurrentUser(context);
      
      // Check admin permissions
      await this.requirePermission(user, 'view_company_data');
      
      this.logAction('get_mood_analytics_admin', user);
      
      // Validate query parameters
      const queryParams = this.validateQueryParams(moodQuerySchema as any, query || {}) as MoodQueryInput;
      const period = queryParams.period || '30d';
      
      // Calculate date range based on period
      const now = new Date();
      const dateFrom = new Date();
      
      switch (period) {
        case '7d':
          dateFrom.setDate(now.getDate() - 7);
          break;
        case '90d':
          dateFrom.setDate(now.getDate() - 90);
          break;
        case '1y':
          dateFrom.setFullYear(now.getFullYear() - 1);
          break;
        default: // 30d
          dateFrom.setDate(now.getDate() - 30);
      }
      
      // Build queries based on user role and permissions
      const queries: DatabaseQuery[] = [
        { field: '$createdAt', operator: 'greaterEqual', value: dateFrom.toISOString() }
      ];
      
      if (queryParams.userId) {
        queries.push({ field: 'userId', operator: 'equal', value: queryParams.userId });
      }
      
      if (user.role === 'COMPANY_ADMIN' && user.companyId) {
        // Company admin can only see their company's data
        // This would require a more complex query joining users and moods
        // For now, we'll use a simplified approach
      } else if (queryParams.companyId && user.role === 'SUPER_ADMIN') {
        // Super admin can filter by company - would need to join with users
        // For now, just get all entries
      }
      
      // Get mood entries for analytics
      const result = await this.services.databaseService.list<MoodEntry>('moods', queries);
      
      // Calculate analytics
      const analytics = {
        totalEntries: result.total,
        period: {
          from: dateFrom.toISOString(),
          to: now.toISOString()
        },
        moodDistribution: this.calculateMoodDistribution(result.documents),
        averageIntensity: this.calculateAverageIntensity(result.documents),
        trendsOverTime: this.calculateTrendsOverTime(result.documents)
      };
      
      this.logAction('mood_analytics_retrieved_admin', user, { 
        totalEntries: analytics.totalEntries,
        period 
      });
      
      return this.success({ analytics });
      
    } catch (error) {
      this.logError(error as Error, 'get_mood_analytics_admin');
      return this.handleBusinessError(error as Error, set);
    }
  }

  /**
   * Calculate mood insights from mood history
   */
  private calculateMoodInsights(moods: MoodEntry[]) {
    if (moods.length === 0) {
      return {
        trend: 'stable',
        averageIntensity: 0,
        mostCommonMood: null,
        moodDistribution: {},
        recommendations: ['Start logging your moods to get insights'],
      };
    }

    // Calculate average intensity (work with nested structure)
    const totalIntensity = moods.reduce((sum, mood) => sum + mood.mood.intensity, 0);
    const averageIntensity = Math.round((totalIntensity / moods.length) * 10) / 10;

    // Calculate mood distribution (work with nested structure)
    const moodCounts = moods.reduce((counts, mood) => {
      counts[mood.mood.current] = (counts[mood.mood.current] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const mostCommonMood = Object.entries(moodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || null;

    // Calculate trend (simplified)
    const recentMoods = moods.slice(0, Math.min(7, moods.length));
    const olderMoods = moods.slice(7, Math.min(14, moods.length));
    
    let trend = 'stable';
    if (recentMoods.length > 0 && olderMoods.length > 0) {
      const recentAvg = recentMoods.reduce((sum, m) => sum + m.mood.intensity, 0) / recentMoods.length;
      const olderAvg = olderMoods.reduce((sum, m) => sum + m.mood.intensity, 0) / olderMoods.length;
      
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
   * Calculate mood distribution for analytics
   */
  private calculateMoodDistribution(moods: MoodEntry[]) {
    const moodCounts: Record<string, number> = {};
    
    moods.forEach(mood => {
      const current = mood.mood.current || 'unknown';
      moodCounts[current] = (moodCounts[current] || 0) + 1;
    });
    
    return moodCounts;
  }

  /**
   * Calculate average intensity for analytics
   */
  private calculateAverageIntensity(moods: MoodEntry[]) {
    if (moods.length === 0) return 0;
    
    const totalIntensity = moods.reduce((sum, mood) => sum + mood.mood.intensity, 0);
    return Math.round((totalIntensity / moods.length) * 10) / 10;
  }

  /**
   * Calculate trends over time for analytics
   */
  private calculateTrendsOverTime(moods: MoodEntry[]) {
    // Group moods by day
    const dailyMoods: Record<string, MoodEntry[]> = {};
    
    moods.forEach(mood => {
      const date = new Date(mood.$createdAt || mood.mood.timestamp).toISOString().split('T')[0];
      if (date) {
        if (!dailyMoods[date]) {
          dailyMoods[date] = [];
        }
        dailyMoods[date].push(mood);
      }
    });
    
    // Calculate daily averages
    const dailyAverages = Object.entries(dailyMoods)
      .map(([date, dayMoods]) => ({
        date,
        averageIntensity: dayMoods.reduce((sum, m) => sum + m.mood.intensity, 0) / dayMoods.length,
        entryCount: dayMoods.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return dailyAverages;
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

  /**
   * Transform flattened mood data to nested response structure
   */
  private transformMoodToResponse(dbMood: any): MoodEntry {
    return {
      $id: dbMood.$id,
      $createdAt: dbMood.$createdAt,
      $updatedAt: dbMood.$updatedAt,
      userId: dbMood.userId,
      mood: {
        current: dbMood.current,
        intensity: dbMood.intensity,
        timestamp: dbMood.timestamp,
        triggers: dbMood.triggers || [],
        notes: dbMood.notes || ''
      },
      // Extended mood data
      location: dbMood.location,
      weather: dbMood.weather,
      activities: dbMood.activities || [],
      sleepQuality: dbMood.sleepQuality,
      stressLevel: dbMood.stressLevel,
      energyLevel: dbMood.energyLevel,
      socialInteraction: dbMood.socialInteraction,
      createdAt: dbMood.$createdAt,
      updatedAt: dbMood.$updatedAt
    };
  }
}