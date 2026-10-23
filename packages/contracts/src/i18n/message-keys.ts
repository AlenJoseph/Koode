/**
 * Canonical message keys for the learner app shell.
 * Every key must exist in apps/web/locales/{en,ml}/common.json.
 */
export const messageKeys = [
  'app.name',
  'app.tagline',
  'nav.home',
  'nav.challenges',
  'nav.progress',
  'nav.tutor',
  'nav.signIn',
  'nav.signOut',
  'locale.switch',
  'locale.en',
  'locale.ml',
  'health.ok',
  'auth.title',
  'auth.emailLabel',
  'auth.sendLink',
  'auth.linkSent',
  'auth.verifyTitle',
  'auth.verifying',
  'auth.verifyFailed',
  'auth.signedInAs',
  'home.welcome',
  'home.signedOutHint',
  'tutor.title',
  'tutor.topicLabel',
  'tutor.messageLabel',
  'tutor.send',
  'tutor.needSignIn',
  'tutor.error',
  'tutor.guidingQuestion',
] as const;

export type MessageKey = (typeof messageKeys)[number];
