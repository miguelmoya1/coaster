import { EstablishmentRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('EstablishmentsController (e2e)', () => {
  const testSetup = new E2eTestSetup();

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
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
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/establishments', () => {
    it('should create an establishment and assign the user as OWNER', async () => {
      const createEstablishmentDto = { name: 'My New Establishment' };

      await request(testSetup.app.getHttpServer()).post('/api/establishments').send(createEstablishmentDto).expect(201);

      const establishments = await testSetup.prisma.dbEstablishment.findMany({
        include: { members: true },
      });

      expect(establishments).toHaveLength(1);
      expect(establishments[0].name).toBe(createEstablishmentDto.name);
      expect(establishments[0].members).toHaveLength(1);
      expect(establishments[0].members[0].userId).toBe(mockUser.id);
      expect(establishments[0].members[0].role).toBe(EstablishmentRole.OWNER);
    });

    it('should reject invalid payloads', async () => {
      await request(testSetup.app.getHttpServer()).post('/api/establishments').send({ name: 'A' }).expect(400);
    });
  });

  describe('GET /api/establishments', () => {
    it('should return a list of establishments the user is a member of', async () => {
      const establishment = await testSetup.createEstablishment('Seeded Establishment', {
        role: EstablishmentRole.STAFF,
      });

      const response = await request(testSetup.app.getHttpServer()).get('/api/establishments').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(establishment.id);
      expect(response.body[0].name).toBe('Seeded Establishment');
    });
  });

  describe('GET /api/establishments/:establishmentId', () => {
    it('should return a specific establishment if the user is a member', async () => {
      const establishment = await testSetup.createEstablishment('My Establishment', {
        role: EstablishmentRole.MANAGER,
      });

      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/establishments/${establishment.id}`)
        .expect(200);

      expect(response.body.id).toBe(establishment.id);
      expect(response.body.name).toBe('My Establishment');
    });

    it('should return 403 Forbidden if the user is not a member', async () => {
      const establishment = await testSetup.createEstablishment('Other Establishment', { ownerId: null });

      await request(testSetup.app.getHttpServer()).get(`/api/establishments/${establishment.id}`).expect(403);
    });
  });
});
