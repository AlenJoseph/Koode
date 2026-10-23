import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { users, type Database } from '@koode/database';
import type { AuthService } from '../auth/service.js';
import type { ApiConfig } from '../config.js';
import { AuthError } from '../auth/errors.js';

export async function registerAdminRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    database: Database;
  },
): Promise<void> {
  const { config, auth, database } = deps;

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
}
