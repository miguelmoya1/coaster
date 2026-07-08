import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('BarsController (e2e)', () => {
  const testSetup = new E2eTestSetup();

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    // Seed the mock user for tests
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

  describe('POST /api/bars', () => {
    it('should create a bar and assign the user as OWNER', async () => {
      const createBarDto = { name: 'My New Bar' };

      await request(testSetup.app.getHttpServer()).post('/api/bars').send(createBarDto).expect(201); // Created

      // Verify in database
      const bars = await testSetup.prisma.dbBar.findMany({
        include: { members: true },
      });

      expect(bars).toHaveLength(1);
      expect(bars[0].name).toBe(createBarDto.name);
      expect(bars[0].members).toHaveLength(1);
      expect(bars[0].members[0].userId).toBe(mockUser.id);
      expect(bars[0].members[0].role).toBe(BarRole.OWNER);
    });

    it('should reject invalid payloads', async () => {
      // Name too short
      await request(testSetup.app.getHttpServer()).post('/api/bars').send({ name: 'A' }).expect(400);
    });
  });

  describe('GET /api/bars', () => {
    it('should return a list of bars the user is a member of', async () => {
      // Seed a bar and membership
      const bar = await testSetup.prisma.dbBar.create({
        data: {
          name: 'Seeded Bar',
          members: {
            create: {
              userId: mockUser.id,
              role: BarRole.STAFF,
            },
          },
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get('/api/bars').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(bar.id);
      expect(response.body[0].name).toBe('Seeded Bar');
    });
  });

  describe('GET /api/bars/:barId', () => {
    it('should return a specific bar if the user is a member', async () => {
      const bar = await testSetup.prisma.dbBar.create({
        data: {
          name: 'My Bar',
          members: {
            create: {
              userId: mockUser.id,
              role: BarRole.MANAGER,
            },
          },
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${bar.id}`).expect(200);

      expect(response.body.id).toBe(bar.id);
      expect(response.body.name).toBe('My Bar');
    });

    it('should return 403 Forbidden if the user is not a member', async () => {
      const bar = await testSetup.prisma.dbBar.create({
        data: { name: 'Other Bar' },
      });

      await request(testSetup.app.getHttpServer()).get(`/api/bars/${bar.id}`).expect(403);
    });
  });
});
