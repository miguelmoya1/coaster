import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('CategoriesController (e2e)', () => {
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

  describe('POST /api/bars/:barId/categories', () => {
    it('should create a category', async () => {
      const dto = {
        name: 'Drinks',
        icon: 'beer',
      };

      await request(testSetup.app.getHttpServer()).post(`/api/bars/${barId}/categories`).send(dto).expect(201);

      // Verify in database
      const categories = await testSetup.prisma.dbCategory.findMany({
        where: { barId },
      });

      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe(dto.name);
      expect(categories[0].icon).toBe(dto.icon);
    });

    it('should reject invalid payloads', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/categories`)
        .send({ name: '' }) // name cannot be empty
        .expect(400);
    });
  });

  describe('GET /api/bars/:barId/categories', () => {
    it('should return a list of categories', async () => {
      // Seed a category
      const category = await testSetup.prisma.dbCategory.create({
        data: {
          name: 'Food',
          barId,
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/categories`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(category.id);
      expect(response.body[0].name).toBe('Food');
    });
  });

  describe('PATCH /api/bars/:barId/categories/:categoryId', () => {
    it('should update a category', async () => {
      const category = await testSetup.prisma.dbCategory.create({
        data: {
          name: 'Old Name',
          barId,
        },
      });

      await request(testSetup.app.getHttpServer())
        .patch(`/api/bars/${barId}/categories/${category.id}`)
        .send({ name: 'New Name' })
        .expect(200);

      // Verify in database
      const updated = await testSetup.prisma.dbCategory.findUnique({
        where: { id: category.id },
      });
      expect(updated?.name).toBe('New Name');
    });
  });

  describe('DELETE /api/bars/:barId/categories/:categoryId', () => {
    it('should soft delete a category', async () => {
      const category = await testSetup.prisma.dbCategory.create({
        data: {
          name: 'To Delete',
          barId,
        },
      });

      await request(testSetup.app.getHttpServer()).delete(`/api/bars/${barId}/categories/${category.id}`).expect(200);

      // Verify in database
      const deleted = await testSetup.prisma.dbCategory.findUnique({
        where: { id: category.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });
  });
});
