import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('ProductsController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;
  let categoryId: string;

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

    // Seed a category
    const category = await testSetup.prisma.dbCategory.create({
      data: {
        name: 'Drinks',
        barId,
      },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/bars/:barId/products', () => {
    it('should create a product', async () => {
      const dto = {
        name: 'Beer',
        categoryId,
        price: 5,
        currentStock: 100,
        minStockAlert: 10,
      };

      await request(testSetup.app.getHttpServer()).post(`/api/bars/${barId}/products`).send(dto).expect(201);

      // Verify in database
      const products = await testSetup.prisma.dbProduct.findMany({
        where: { categoryId },
      });

      expect(products).toHaveLength(1);
      expect(products[0].name).toBe(dto.name);
      expect(products[0].categoryId).toBe(categoryId);
      expect(products[0].price).toBe(dto.price);
      expect(products[0].currentStock).toBe(dto.currentStock);
    });

    it('should reject invalid payload (missing name)', async () => {
      await request(testSetup.app.getHttpServer()).post(`/api/bars/${barId}/products`).send({ categoryId }).expect(400);
    });
  });

  describe('GET /api/bars/:barId/products', () => {
    it('should return a list of products', async () => {
      // Seed a product
      const product = await testSetup.prisma.dbProduct.create({
        data: {
          name: 'Coke',
          categoryId,
          price: 2,
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/products`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(product.id);
      expect(response.body[0].name).toBe('Coke');
      expect(response.body[0].price).toBe(2);
    });
  });

  describe('PATCH /api/bars/:barId/products/:productId', () => {
    it('should update a product', async () => {
      const product = await testSetup.prisma.dbProduct.create({
        data: {
          name: 'Old Name',
          categoryId,
        },
      });

      await request(testSetup.app.getHttpServer())
        .patch(`/api/bars/${barId}/products/${product.id}`)
        .send({ name: 'New Name', price: 10 })
        .expect(200);

      const updated = await testSetup.prisma.dbProduct.findUnique({
        where: { id: product.id },
      });
      expect(updated?.name).toBe('New Name');
      expect(updated?.price).toBe(10);
    });
  });

  describe('PATCH /api/bars/:barId/products/:productId/stock', () => {
    it('should update product stock', async () => {
      const product = await testSetup.prisma.dbProduct.create({
        data: {
          name: 'Beer',
          categoryId,
          currentStock: 10,
        },
      });

      await request(testSetup.app.getHttpServer())
        .patch(`/api/bars/${barId}/products/${product.id}/stock`)
        .send({ currentStock: 5 })
        .expect(200);

      const updated = await testSetup.prisma.dbProduct.findUnique({
        where: { id: product.id },
      });
      expect(updated?.currentStock).toBe(5);
    });
  });

  describe('DELETE /api/bars/:barId/products/:productId', () => {
    it('should soft delete a product', async () => {
      const product = await testSetup.prisma.dbProduct.create({
        data: {
          name: 'To Delete',
          categoryId,
        },
      });

      await request(testSetup.app.getHttpServer()).delete(`/api/bars/${barId}/products/${product.id}`).expect(200);

      const deleted = await testSetup.prisma.dbProduct.findUnique({
        where: { id: product.id },
      });
      expect(deleted?.deletedAt).not.toBeNull();
    });
  });
});
