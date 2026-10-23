import type { AiGateway } from '@koode/ai-gateway';
import type { FastifyInstance } from 'fastify';
import { getHealth } from '../health.js';

export async function registerHealthRoutes(
  app: FastifyInstance,
  gateway: AiGateway,
): Promise<void> {
  app.get('/health', async () => ({
    ...getHealth(),
    aiAdapter: gateway.adapterId,
  }));
}
