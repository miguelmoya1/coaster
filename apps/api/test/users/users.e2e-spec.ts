import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('UsersController (e2e)', () => {
  const testSetup = new E2eTestSetup();

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();
    
    // Seed the mock user for tests that require a database user to exist
    await testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'USER',
        active: true,
      },
    });
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('GET /api/users/me', () => {
    it('should return the current user profile', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .get('/api/users/me')
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      }));
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update the current user profile', async () => {
      const updatedName = 'Updated Name';
      
      await request(testSetup.app.getHttpServer())
        .patch('/api/users/me')
        .send({ name: updatedName })
        .expect(200);

      // Verify in database
      const userInDb = await testSetup.prisma.dbUser.findUnique({
        where: { id: mockUser.id },
      });
      
      expect(userInDb?.name).toBe(updatedName);
    });
  });
});
