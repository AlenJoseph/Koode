import { describe, expect, it } from 'vitest';
import {
  consentRecords,
  learnerProfiles,
  magicLinkTokens,
  sessions,
  tutorTurns,
  users,
} from './index.js';

describe('database schema', () => {
  it('exports learner-owned tables', () => {
    expect(users).toBeDefined();
    expect(learnerProfiles).toBeDefined();
    expect(consentRecords).toBeDefined();
    expect(sessions).toBeDefined();
    expect(magicLinkTokens).toBeDefined();
    expect(tutorTurns).toBeDefined();
  });
});
