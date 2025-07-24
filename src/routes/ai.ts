import { Elysia, t } from 'elysia';
import { withServices } from '../container/ServiceContainer.js';
import { authMiddleware } from '../middleware/auth.js';
import { AIController } from '../controllers/AIController.js';

export const aiRoutes = new Elysia()
  
  // Chat with AI
  .post('/chat', withServices(async (services, context) => {
    const controller = new AIController(services);
    return await controller.chatWithAI(context);
  }), {
    beforeHandle: authMiddleware,
    body: t.Object({
      message: t.String({ 
        minLength: 1, 
        maxLength: 4000,
        description: 'Message to send to AI assistant'
      }),
      includeContext: t.Optional(t.Boolean({
        default: true,
        description: 'Whether to include user context (recent moods, journal themes) for personalized responses'
      }))
    }),
    detail: {
      tags: ['AI'],
      summary: 'Chat with AI wellness companion',
      description: 'Send a message to the AI wellness companion and receive a personalized response based on your mental health data',
      security: [{ bearerAuth: [] }],
    },
  })

  // Analyze journal entry
  .post('/analyze/journal', withServices(async (services, context) => {
    const controller = new AIController(services);
    return await controller.analyzeJournal(context);
  }), {
    beforeHandle: authMiddleware,
    body: t.Object({
      entryId: t.String({ 
        minLength: 1,
        description: 'ID of the journal entry to analyze'
      })
    }),
    detail: {
      tags: ['AI'],
      summary: 'Analyze journal entry with AI',
      description: 'Get AI-powered analysis of a journal entry including sentiment, emotions, themes, and personalized suggestions',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get mood insights
  .get('/insights/mood', withServices(async (services, context) => {
    const controller = new AIController(services);
    return await controller.getMoodInsights(context);
  }), {
    beforeHandle: authMiddleware,
    query: t.Optional(t.Object({
      period: t.Optional(t.Union([
        t.Literal('7d'),
        t.Literal('30d'),
        t.Literal('90d')
      ], { 
        default: '30d',
        description: 'Time period for mood analysis'
      }))
    })),
    detail: {
      tags: ['AI'],
      summary: 'Get AI mood insights',
      description: 'Receive AI-powered insights about mood patterns, trends, and personalized recommendations',
      security: [{ bearerAuth: [] }],
    },
  })

  // Generate wellness content
  .get('/content/wellness', withServices(async (services, context) => {
    const controller = new AIController(services);
    return await controller.getWellnessContent(context);
  }), {
    beforeHandle: authMiddleware,
    query: t.Optional(t.Object({
      type: t.Optional(t.Union([
        t.Literal('daily_affirmation'),
        t.Literal('mindfulness_tip'),
        t.Literal('gratitude_prompt'),
        t.Literal('breathing_exercise')
      ], { 
        default: 'daily_affirmation',
        description: 'Type of wellness content to generate'
      }))
    })),
    detail: {
      tags: ['AI'],
      summary: 'Generate wellness content',
      description: 'Get AI-generated personalized wellness content including affirmations, mindfulness tips, gratitude prompts, and breathing exercises',
      security: [{ bearerAuth: [] }],
    },
  })

  // Get AI capabilities
  .get('/capabilities', withServices(async (services, context) => {
    const controller = new AIController(services);
    return await controller.getAICapabilities(context);
  }), {
    beforeHandle: authMiddleware,
    detail: {
      tags: ['AI'],
      summary: 'Get AI capabilities',
      description: 'Retrieve information about available AI features, rate limits, and capabilities',
      security: [{ bearerAuth: [] }],
    },
  })

  // AI health check
  .get('/health', withServices(async (services, context) => {
    const controller = new AIController(services);
    return await controller.getAIHealth(context);
  }), {
    detail: {
      tags: ['AI'],
      summary: 'AI service health check',
      description: 'Check the health and availability of the AI service',
    },
  });