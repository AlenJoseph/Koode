import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthService } from '../auth/service.js';
import type { ClassroomService } from '../classroom/service.js';
import type { ApiConfig } from '../config.js';
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../lib/cookies.js';
import type { MemoryRateLimiter } from '../lib/rate-limit.js';

export async function registerClassroomRoutes(
  app: FastifyInstance,
  deps: {
    config: ApiConfig;
    auth: AuthService;
    classroom: ClassroomService;
    studentSignInLimiter: MemoryRateLimiter;
  },
): Promise<void> {
  const { config, auth, classroom, studentSignInLimiter } = deps;

  async function currentUser(request: FastifyRequest) {
    const sessionToken = readSessionToken(request, config);
    if (!sessionToken) {
      return null;
    }
    return auth.getUserForSessionToken(sessionToken);
  }

  app.post('/classroom/sections', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireTeacher(user);
    const section = await classroom.createSection(user.id, request.body);
    request.log.info(
      { event: 'classroom.section_created', sectionId: section.id },
      'section created',
    );
    return { section: { id: section.id, name: section.name, code: section.code } };
  });

  app.get('/classroom/sections', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireTeacher(user);
    const list = await classroom.listTeacherSections(user.id);
    return {
      sections: list.map((section) => ({
        id: section.id,
        name: section.name,
        code: section.code,
        archivedAt: section.archivedAt ? section.archivedAt.toISOString() : null,
      })),
    };
  });

  app.post('/classroom/sections/:sectionId/archive', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireTeacher(user);
    const { sectionId } = request.params as { sectionId: string };
    const section = await classroom.archiveSection(user.id, sectionId);
    request.log.info({ event: 'classroom.section_archived', sectionId }, 'section archived');
    return {
      section: {
        id: section.id,
        name: section.name,
        code: section.code,
        archivedAt: section.archivedAt ? section.archivedAt.toISOString() : null,
      },
    };
  });

  app.get('/classroom/sections/:sectionId/roster', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireTeacher(user);
    const { sectionId } = request.params as { sectionId: string };
    const roster = await classroom.listRoster(user.id, sectionId);
    return { roster };
  });

  app.post('/classroom/sections/:sectionId/students', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireTeacher(user);
    const { sectionId } = request.params as { sectionId: string };
    const student = await classroom.addStudent(user.id, sectionId, request.body);
    request.log.info(
      { event: 'classroom.student_added', sectionId, userId: student.userId },
      'student added',
    );
    return { student };
  });

  app.delete('/classroom/sections/:sectionId/students/:membershipId', async (request, reply) => {
    const user = await currentUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    auth.requireTeacher(user);
    const { sectionId, membershipId } = request.params as {
      sectionId: string;
      membershipId: string;
    };
    const result = await classroom.removeStudent(user.id, sectionId, membershipId);
    request.log.info(
      { event: 'classroom.student_removed', sectionId, userId: result.userId },
      'student removed from section',
    );
    return { ok: true };
  });

  app.post(
    '/classroom/sections/:sectionId/students/:membershipId/reset-secret',
    async (request, reply) => {
      const user = await currentUser(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      auth.requireTeacher(user);
      const { sectionId, membershipId } = request.params as {
        sectionId: string;
        membershipId: string;
      };
      const student = await classroom.resetStudentSecretWords(user.id, sectionId, membershipId);
      request.log.info(
        { event: 'classroom.secret_reset', sectionId, userId: student.userId },
        'student secret words reset',
      );
      return { student };
    },
  );

  app.get('/classroom/join/:code', async (request, reply) => {
    const limit = studentSignInLimiter.check(`join-lookup:${request.ip}`);
    if (!limit.ok) {
      reply.header('retry-after', String(limit.retryAfterSec));
      return reply.status(429).send({ error: 'rate_limited', retryAfterSec: limit.retryAfterSec });
    }

    const { code } = request.params as { code: string };
    const section = await classroom.lookupSectionByCode({ code });
    return { section };
  });

  app.post('/classroom/student/sign-in', async (request, reply) => {
    const limit = studentSignInLimiter.check(`student-signin:${request.ip}`);
    if (!limit.ok) {
      reply.header('retry-after', String(limit.retryAfterSec));
      return reply.status(429).send({ error: 'rate_limited', retryAfterSec: limit.retryAfterSec });
    }

    const authenticated = await classroom.authenticateStudent(request.body);

    const session = await auth.createSessionForUser(authenticated.userId);
    setSessionCookie(reply, config, session.sessionToken, session.expiresAt);
    request.log.info(
      { event: 'classroom.student_signed_in', userId: session.user.id },
      'student signed in',
    );
    return { ok: true, user: session.user };
  });

  app.post('/classroom/student/sign-out', async (request, reply) => {
    const sessionToken = readSessionToken(request, config);
    if (sessionToken) {
      await auth.revokeSession(sessionToken);
    }
    clearSessionCookie(reply, config);
    return { ok: true };
  });
}
