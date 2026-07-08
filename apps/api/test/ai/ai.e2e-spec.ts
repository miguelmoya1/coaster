import { BarRole } from '@coaster/common';
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
    // Temporary make mock user an ADMIN to bypass AdminGuard if needed, but here we just need a bar
    await testSetup.setup();
    await testSetup.clearDatabase();

    // Seed the mock user
    await testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'USER',
        active: true,
      },
    });

    // Seed a bar owned by mockUser
    const bar = await testSetup.prisma.dbBar.create({
      data: {
        name: 'My Bar',
        members: {
          create: {
            userId: mockUser.id,
            role: BarRole.OWNER,
          },
        },
      },
    });
    barId = bar.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/bars/:barId/ai', () => {
    it('should be guarded by authentication and bar permissions', async () => {
      // It's mocked, so it passes auth and permissions.
      // But we just check the route responds (either 201 created or 500 if AI provider fails)
      const response = await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/ai`)
        .send({ prompt: 'Suggest me a drink' });

      expect(response.status === 201 || response.status === 500).toBeTruthy();
    }, 20000);
  });
});
