import { TableStatus } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('TablesController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;

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

    const establishment = await testSetup.createEstablishment('My Establishment');
    establishmentId = establishment.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/establishments/:establishmentId/tables', () => {
    it('should create a table', async () => {
      const dto = { name: 'Table 1' };

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/tables`)
        .send(dto)
        .expect(201);

      const tables = await testSetup.prisma.dbTable.findMany({
        where: { establishmentId },
      });

      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe(dto.name);
      expect(tables[0].status).toBe(TableStatus.FREE);
    });

    it('should reject invalid payloads', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/tables`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/establishments/:establishmentId/tables', () => {
    it('should return a list of tables', async () => {
      const table = await testSetup.prisma.dbTable.create({
        data: {
          name: 'Table 2',
          establishmentId,
        },
      });

      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/establishments/${establishmentId}/tables`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(table.id);
      expect(response.body[0].name).toBe('Table 2');
    });
  });

  describe('PATCH /api/establishments/:establishmentId/tables/:tableId', () => {
    it('should update a table name', async () => {
      const table = await testSetup.prisma.dbTable.create({
        data: {
          name: 'Old Name',
          establishmentId,
        },
      });

      await request(testSetup.app.getHttpServer())
        .patch(`/api/establishments/${establishmentId}/tables/${table.id}`)
        .send({ name: 'New Name' })
        .expect(200);

      const updated = await testSetup.prisma.dbTable.findUnique({
        where: { id: table.id },
      });
      expect(updated?.name).toBe('New Name');
    });
  });

  describe('DELETE /api/establishments/:establishmentId/tables/:tableId', () => {
    it('should delete a table', async () => {
      const table = await testSetup.prisma.dbTable.create({
        data: {
          name: 'To Delete',
          establishmentId,
        },
      });

      await request(testSetup.app.getHttpServer())
        .delete(`/api/establishments/${establishmentId}/tables/${table.id}`)
        .expect(200);

      const deleted = await testSetup.prisma.dbTable.findUnique({
        where: { id: table.id },
      });
      expect(deleted).toBeNull();
    });
  });
});
