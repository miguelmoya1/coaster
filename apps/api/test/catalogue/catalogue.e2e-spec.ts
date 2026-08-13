import { Role } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('CatalogueController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;

  const setLanguage = (language: string) =>
    testSetup.prisma.dbEstablishmentSettings.update({ where: { establishmentId }, data: { language } });

  const catalogueOf = (id: string) => request(testSetup.app.getHttpServer()).get(`/api/establishments/${id}/catalogue`);

  const importInto = (id: string, body: Record<string, unknown> = {}) =>
    request(testSetup.app.getHttpServer()).post(`/api/establishments/${id}/catalogue/import`).send(body);

  beforeAll(async () => {
    mockUser.role = 'ADMIN';
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: Role.ADMIN, active: true },
    });

    const establishment = await testSetup.createEstablishment('My Establishment');
    establishmentId = establishment.id;
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  describe('reading the starter catalogue', () => {
    it('should hand back words rather than translation keys', async () => {
      const { body } = await catalogueOf(establishmentId).expect(200);

      const names = body.flatMap((category: { name: string; products: { name: string }[] }) => [
        category.name,
        ...category.products.map((product) => product.name),
      ]);

      expect(names.length).toBeGreaterThan(0);
      expect(names.filter((name: string) => name.startsWith('templates.'))).toEqual([]);
    });

    it('should answer in the establishment language', async () => {
      const spanish = await catalogueOf(establishmentId).expect(200);
      expect(spanish.body[0].name).toBe('Cafetería');

      await setLanguage('en');

      const english = await catalogueOf(establishmentId).expect(200);
      expect(english.body[0].name).toBe('Coffee Shop');
    });
  });

  describe('importing it', () => {
    it('should create the chosen categories with their products', async () => {
      await importInto(establishmentId, { categoryKeys: ['cafeteria'] }).expect(201);

      const categories = await testSetup.prisma.dbCategory.findMany({ where: { establishmentId } });
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Cafetería');

      const products = await testSetup.prisma.dbProduct.findMany({ where: { categoryId: categories[0].id } });
      expect(products.map((product) => product.name)).toContain('Café Solo');
    });

    it('should take no selection as the whole catalogue', async () => {
      await importInto(establishmentId).expect(201);

      const categories = await testSetup.prisma.dbCategory.findMany({ where: { establishmentId } });
      const products = await testSetup.prisma.dbProduct.findMany();

      expect(categories).toHaveLength(7);
      expect(products).toHaveLength(76);
    });

    it('should write the establishment language into the rows', async () => {
      await setLanguage('en');

      await importInto(establishmentId, { categoryKeys: ['cafeteria'] }).expect(201);

      const categories = await testSetup.prisma.dbCategory.findMany({ where: { establishmentId } });
      expect(categories[0].name).toBe('Coffee Shop');

      const products = await testSetup.prisma.dbProduct.findMany({ where: { categoryId: categories[0].id } });
      expect(products.map((product) => product.name)).toContain('Black Coffee');
    });

    it('should duplicate nothing when the same import runs twice', async () => {
      await importInto(establishmentId, { categoryKeys: ['cafeteria'] }).expect(201);
      await importInto(establishmentId, { categoryKeys: ['cafeteria'] }).expect(201);

      const categories = await testSetup.prisma.dbCategory.findMany({ where: { establishmentId } });
      const products = await testSetup.prisma.dbProduct.findMany({ where: { categoryId: categories[0].id } });

      expect(categories).toHaveLength(1);
      expect(products).toHaveLength(8);
    });

    it('should reject a selection naming nothing the catalogue has', async () => {
      await importInto(establishmentId, { categoryKeys: ['sushi'] }).expect(400);

      expect(await testSetup.prisma.dbCategory.findMany({ where: { establishmentId } })).toEqual([]);
    });
  });
});
