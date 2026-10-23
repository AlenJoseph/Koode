/**
 * Canonical Pino redact paths for the API logger.
 * Keep in sync with docs/privacy.md (E7-S1).
 */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.email',
  'req.body.token',
  'req.body.learnerMessage',
  'req.body.devToken',
  'req.body.secretWords',
  'req.body.bootstrapSecret',
] as const;

export const DEFAULT_TUTOR_TURN_RETENTION_DAYS = 365;
