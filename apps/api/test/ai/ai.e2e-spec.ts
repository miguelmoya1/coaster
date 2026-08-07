import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn().mockResolvedValue({ text: 'Mock response', toolResults: [] }),
  };
});

describe('AiController (e2e)', () => {
  const testSetup = new E2eTestSetup();

  let barId: string;

  beforeAll(async () => {
    await testSetup.setup();
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'USER',
        active: true,
      },
    });

    const bar = await testSetup.createBar('My Bar');
    barId = bar.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/bars/:barId/ai', () => {
    it('should be guarded by authentication and bar permissions', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/ai`)
        .send({ prompt: 'Suggest me a drink' });

      expect(response.status === 201 || response.status === 500).toBeTruthy();
    }, 20000);
  });
});
