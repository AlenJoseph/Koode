import { describe, expect, it } from 'vitest';
import {
  consentRecords,
  learnerProfiles,
  magicLinkTokens,
  sectionStudents,
  sections,
  sessions,
  tutorTurns,
  userEmails,
  users,
} from './index.js';

describe('database schema', () => {
  it('exports learner-owned, classroom, and multi-email tables', () => {
    expect(users).toBeDefined();
    expect(userEmails).toBeDefined();
    expect(learnerProfiles).toBeDefined();
    expect(consentRecords).toBeDefined();
    expect(sessions).toBeDefined();
    expect(magicLinkTokens).toBeDefined();
    expect(tutorTurns).toBeDefined();
    expect(sections).toBeDefined();
    expect(sectionStudents).toBeDefined();
  });
});

