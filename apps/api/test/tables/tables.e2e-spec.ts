import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('TablesController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
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
            role: 'OWNER',
          },
        },
      },
    });
    barId = bar.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/bars/:barId/tables', () => {
    it('should create a table', async () => {
      const dto = { name: 'Table 1' };

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/tables`)
        .send(dto)
        .expect(201);

      // Verify in database
      const tables = await testSetup.prisma.dbTable.findMany({
        where: { barId },
      });
      
      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe(dto.name);
      expect(tables[0].status).toBe('FREE');
    });

    it('should reject invalid payloads', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/tables`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/bars/:barId/tables', () => {
    it('should return a list of tables', async () => {
      const table = await testSetup.prisma.dbTable.create({
        data: {
          name: 'Table 2',
          barId,
        },
      });

      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/bars/${barId}/tables`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(table.id);
      expect(response.body[0].name).toBe('Table 2');
    });
  });

  describe('PATCH /api/bars/:barId/tables/:tableId', () => {
    it('should update a table name', async () => {
      const table = await testSetup.prisma.dbTable.create({
        data: {
          name: 'Old Name',
          barId,
        },
      });

      await request(testSetup.app.getHttpServer())
        .patch(`/api/bars/${barId}/tables/${table.id}`)
        .send({ name: 'New Name' })
        .expect(200);

      const updated = await testSetup.prisma.dbTable.findUnique({
        where: { id: table.id },
      });
      expect(updated?.name).toBe('New Name');
    });
  });

  describe('DELETE /api/bars/:barId/tables/:tableId', () => {
    it('should delete a table', async () => {
      const table = await testSetup.prisma.dbTable.create({
        data: {
          name: 'To Delete',
          barId,
        },
      });

      await request(testSetup.app.getHttpServer())
        .delete(`/api/bars/${barId}/tables/${table.id}`)
        .expect(200);

      const deleted = await testSetup.prisma.dbTable.findUnique({
        where: { id: table.id },
      });
      // Hard delete
      expect(deleted).toBeNull();
    });
  });
});
