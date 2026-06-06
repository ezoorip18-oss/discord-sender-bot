
import { z } from 'zod';

export const api = {
  token: {
    save: {
      method: 'POST' as const,
      path: '/api/token',
      input: z.object({ token: z.string().min(1, 'Token is required') }),
      responses: {
        200: z.object({ ok: z.boolean() }),
        400: z.object({ message: z.string() }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/token',
      responses: {
        200: z.object({ token: z.string() }),
      },
    },
  },
  massDm: {
    start: {
      method: 'POST' as const,
      path: '/api/mass-dm/start',
      input: z.object({
        serverId: z.string().min(1, 'Server ID is required'),
        message: z.string().min(1, 'Message is required'),
        delay: z.number().min(1).max(60).default(3),
      }),
      responses: {
        200: z.object({ status: z.string() }),
        400: z.object({ message: z.string() }),
        409: z.object({ message: z.string() }),
      },
    },
    stop: {
      method: 'POST' as const,
      path: '/api/mass-dm/stop',
      responses: {
        200: z.object({ status: z.string() }),
      },
    },
    status: {
      method: 'GET' as const,
      path: '/api/mass-dm/status',
      responses: {
        200: z.object({ isRunning: z.boolean() }),
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/mass-dm/stats',
      responses: {
        200: z.object({
          guildName: z.string(),
          guildId: z.string(),
          sent: z.number(),
          failed: z.number(),
          skipped: z.number(),
          total: z.number(),
          complete: z.boolean(),
        }).nullable(),
      },
    },
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
