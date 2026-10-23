import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { users, type Database } from '@koode/database';
import type { SessionUser } from '@koode/contracts';
import type { AuthService } from '../auth/service.js';
import type { ApiConfig } from '../config.js';
import { AuthError } from '../auth/errors.js';
import {
  createPathwayService,
  type PathwayService,
} from '../content/pathways.js';
import { clearSessionCookie, readSessionToken } from '../lib/cookies.js';

export async function registerAdminRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    database: Database;
    pathways?: PathwayService;
  },
): Promise<void> {
  const { config, auth, database } = deps;
  const pathways = deps.pathways ?? createPathwayService(database);

  async function requireAdmin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<SessionUser | null> {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }
    const user = await auth.getUserForSessionToken(sessionToken);
    if (!user) {
      clearSessionCookie(reply, config);
      await reply.status(401).send({ error: 'Unauthorized' });
      return null;
    }
    auth.requireAdmin(user);
    return user;
  }

  /** Public first-run endpoints — no session required. */
  app.get('/admin/bootstrap/status', async () => auth.getBootstrapStatus());

  app.post('/admin/bootstrap', async (request) => {
    // Never log the secret — rely on Pino redact of req.body.bootstrapSecret.
    const result = await auth.bootstrapAdmin(request.body);
    request.log.info(
      { event: 'admin.bootstrapped', emailDomain: result.email.split('@')[1] },
      'admin bootstrapped',
    );
    return result;
  });

  /** Dev-only: clear platform admins so Playwright can re-run bootstrap. */
  app.post('/admin/bootstrap/dev-reset', async (request, reply) => {
    if (!config.magicLinkDevMode) {
      return reply.status(404).send({ error: 'Not found' });
    }
    const body = (request.body ?? {}) as { bootstrapSecret?: string };
    if (!config.bootstrapSecret || body.bootstrapSecret !== config.bootstrapSecret) {
      throw new AuthError('Invalid bootstrap secret', 403);
    }
    await database.db.delete(users).where(eq(users.role, 'admin'));
    request.log.info({ event: 'admin.bootstrap_dev_reset' }, 'admin bootstrap reset');
    return { ok: true };
  });

  /** Protected admin shell — only role=admin. */
  app.get('/admin/me', async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return;
    }
    return { user };
  });

  app.get('/admin/pathways', async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return;
    }
    const includeArchived =
      (request.query as { includeArchived?: string }).includeArchived === '1';
    const list = await pathways.list({ includeArchived });
    return { pathways: list };
  });

  app.post('/admin/pathways', async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return;
    }
    const pathway = await pathways.create(user.id, request.body);
    request.log.info({ event: 'admin.pathway_created', pathwayId: pathway.id }, 'pathway created');
    return { pathway };
  });

  app.patch('/admin/pathways/:pathwayId', async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return;
    }
    const { pathwayId } = request.params as { pathwayId: string };
    const pathway = await pathways.update(pathwayId, request.body);
    request.log.info({ event: 'admin.pathway_updated', pathwayId }, 'pathway updated');
    return { pathway };
  });

  app.post('/admin/pathways/:pathwayId/archive', async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) {
      return;
    }
    const { pathwayId } = request.params as { pathwayId: string };
    const pathway = await pathways.archive(pathwayId);
    request.log.info({ event: 'admin.pathway_archived', pathwayId }, 'pathway archived');
    return { pathway };
  });
}
