import { expect, test } from '@playwright/test';

const apiBase = process.env.API_ORIGIN ?? 'http://localhost:3001';

test.describe('E8-S1 stub AI default', () => {
  test('happy: API health exposes stub adapter in e2e', async ({ request }) => {
    const health = await request.get(`${apiBase}/health`);
    expect(health.ok()).toBeTruthy();
    const body = (await health.json()) as { ok: boolean; aiAdapter: string };
    expect(body.ok).toBe(true);
    expect(body.aiAdapter).toBe('stub');
  });
});
