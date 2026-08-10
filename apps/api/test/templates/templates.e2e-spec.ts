import { Role } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('TemplatesController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;

  beforeAll(async () => {
    mockUser.role = 'ADMIN';
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: Role.ADMIN,
        active: true,
      },
    });

    const establishment = await testSetup.createEstablishment('My Establishment');
    establishmentId = establishment.id;
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  describe('Categories Templates', () => {
    it('should create a category template', async () => {
      const dto = {
        name: 'Drinks',
        icon: 'beer',
      };

      await request(testSetup.app.getHttpServer()).post('/api/templates/categories').send(dto).expect(201);

      const categories = await testSetup.prisma.dbCategoryTemplate.findMany();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Drinks');
    });

    it('should get all category templates', async () => {
      await testSetup.prisma.dbCategoryTemplate.create({
        data: { name: 'Food', icon: 'burger' },
      });

      const response = await request(testSetup.app.getHttpServer()).get('/api/templates/categories').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Food');
    });

    it('should update a category template', async () => {
      const cat = await testSetup.prisma.dbCategoryTemplate.create({
        data: { name: 'Food', icon: 'burger' },
      });

      await request(testSetup.app.getHttpServer())
        .put(`/api/templates/categories/${cat.id}`)
        .send({ name: 'Snacks' })
        .expect(200);

      const updated = await testSetup.prisma.dbCategoryTemplate.findUnique({ where: { id: cat.id } });
      expect(updated?.name).toBe('Snacks');
    });

    it('should delete a category template', async () => {
      const cat = await testSetup.prisma.dbCategoryTemplate.create({
        data: { name: 'Food', icon: 'burger' },
      });

      await request(testSetup.app.getHttpServer()).delete(`/api/templates/categories/${cat.id}`).expect(200);

      const deleted = await testSetup.prisma.dbCategoryTemplate.findUnique({ where: { id: cat.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Products Templates', () => {
    let catId: string;
    beforeEach(async () => {
      const cat = await testSetup.prisma.dbCategoryTemplate.create({
        data: { name: 'Drinks', icon: 'beer' },
      });
      catId = cat.id;
    });

    it('should create a product template', async () => {
      const dto = {
        name: 'Beer',
        price: 500,
        categoryId: catId,
      };

      await request(testSetup.app.getHttpServer()).post('/api/templates/products').send(dto).expect(201);

      const products = await testSetup.prisma.dbProductTemplate.findMany();
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Beer');
    });
  });

  describe('Import Templates', () => {
    it('should import templates into an establishment', async () => {
      const cat = await testSetup.prisma.dbCategoryTemplate.create({
        data: { name: 'Drinks', icon: 'beer' },
      });

      await testSetup.prisma.dbProductTemplate.create({
        data: { name: 'Beer', price: 500, categoryId: cat.id },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/templates/establishment/${establishmentId}`)
        .send({ categoryTemplateIds: [cat.id] })
        .expect(201);

      const establishmentCategories = await testSetup.prisma.dbCategory.findMany({ where: { establishmentId } });
      expect(establishmentCategories).toHaveLength(1);
      expect(establishmentCategories[0].name).toBe('Drinks');

      const establishmentProducts = await testSetup.prisma.dbProduct.findMany({
        where: { categoryId: establishmentCategories[0].id },
      });
      expect(establishmentProducts).toHaveLength(1);
      expect(establishmentProducts[0].name).toBe('Beer');
    });
  });
});
