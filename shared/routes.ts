
import { z } from 'zod';
import { insertBotConfigSchema, botConfig } from './schema';

export const api = {
  config: {
    get: {
      method: 'GET' as const,
      path: '/api/config',
      responses: {
        200: z.custom<typeof botConfig.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/config',
      input: insertBotConfigSchema,
      responses: {
        200: z.custom<typeof botConfig.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    toggle: {
      method: 'POST' as const,
      path: '/api/config/toggle',
      input: z.object({ isRunning: z.boolean() }),
      responses: {
        200: z.object({ isRunning: z.boolean(), status: z.string() }),
      },
    }
  },
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/logs',
      responses: {
        200: z.array(z.object({ 
          timestamp: z.string(), 
          message: z.string(),
          type: z.enum(['info', 'error', 'success']) 
        })),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
