import { describe, expect, it } from 'vitest';
import {
  challengeAttempts,
  challenges,
  consentRecords,
  learnerProfiles,
  magicLinkTokens,
  pathwayEnrollments,
  pathways,
  projects,
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
    expect(pathways).toBeDefined();
    expect(challenges).toBeDefined();
    expect(pathwayEnrollments).toBeDefined();
    expect(challengeAttempts).toBeDefined();
    expect(projects).toBeDefined();
  });
});

