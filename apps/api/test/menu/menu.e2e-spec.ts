import { Role } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('MenuController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;
  let productId: string;

  const server = () => testSetup.app.getHttpServer();
  const draft = () => request(server()).get(`/api/establishments/${establishmentId}/menu`);
  const save = (body: object) => request(server()).put(`/api/establishments/${establishmentId}/menu`).send(body);
  const publish = () => request(server()).post(`/api/establishments/${establishmentId}/menu/publish`);
  const publicMenu = (slug: string, lang?: string) =>
    request(server()).get(`/api/menus/${slug}${lang ? `?lang=${lang}` : ''}`);

  const oneSection = (overrides: Record<string, unknown> = {}) => ({
    name: 'Carta',
    languages: ['es', 'en'],
    sections: [
      {
        translations: { es: { name: 'Cafetería' }, en: { name: 'Coffee' } },
        items: [
          {
            productId,
            isVisible: true,
            translations: { es: { name: 'Café Solo', description: 'Recién molido' }, en: { name: 'Black Coffee' } },
          },
        ],
      },
    ],
    ...overrides,
  });

  beforeAll(async () => {
    mockUser.role = 'ADMIN';
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: Role.ADMIN, active: true },
    });

    const establishment = await testSetup.createEstablishment('Bar Pepe');
    establishmentId = establishment.id;

    const category = await testSetup.prisma.dbCategory.create({
      data: { establishmentId, name: 'Cafetería', icon: 'coffee' },
    });
    const product = await testSetup.prisma.dbProduct.create({
      data: { categoryId: category.id, name: 'Café Solo', price: 120, allergens: ['MILK'] },
    });
    productId = product.id;
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  describe('the draft', () => {
    it('should start one on first read, slugged from the establishment', async () => {
      const { body } = await draft().expect(200);

      expect(body.slug).toBe('bar-pepe');
      expect(body.sections).toEqual([]);
      expect(body.languages).toEqual(['es']);
      expect(body.hasUnpublishedChanges).toBe(true);
    });

    it('should hand back the same menu on a second read rather than a new one', async () => {
      const first = await draft().expect(200);
      const second = await draft().expect(200);

      expect(second.body.id).toBe(first.body.id);
      expect(await testSetup.prisma.dbMenu.count()).toBe(1);
    });

    it('should replace the draft whole, so a reorder is just a different array', async () => {
      await draft().expect(200);
      await save(oneSection()).expect(200);

      const reordered = oneSection({
        sections: [
          { translations: { es: { name: 'Postres' } }, items: [] },
          { translations: { es: { name: 'Cafetería' } }, items: [] },
        ],
      });
      const { body } = await save(reordered).expect(200);

      expect(body.sections.map((section: { translations: Record<string, { name: string }> }) => section.translations.es.name)).toEqual(
        ['Postres', 'Cafetería'],
      );
      expect(await testSetup.prisma.dbMenuSection.count()).toBe(2);
      expect(await testSetup.prisma.dbMenuItem.count()).toBe(0);
    });

    it('should refuse a product belonging to another establishment', async () => {
      await draft().expect(200);
      const other = await testSetup.createEstablishment('Otro');
      const otherCategory = await testSetup.prisma.dbCategory.create({
        data: { establishmentId: other.id, name: 'Suya' },
      });
      const otherProduct = await testSetup.prisma.dbProduct.create({
        data: { categoryId: otherCategory.id, name: 'Ajena', price: 100 },
      });

      await save(
        oneSection({
          sections: [{ translations: { es: { name: 'X' } }, items: [{ productId: otherProduct.id, translations: {} }] }],
        }),
      ).expect(404);
    });

    it('should refuse dropping the language everything falls back to', async () => {
      await draft().expect(200);

      await save(oneSection({ languages: ['en'] })).expect(400);
    });
  });

  describe('publishing', () => {
    it('should stay a 404 until published', async () => {
      const { body } = await draft().expect(200);
      await save(oneSection()).expect(200);

      await publicMenu(body.slug).expect(404);

      await publish().expect(201);

      await publicMenu(body.slug).expect(200);
    });

    it('should serve the language asked for and default to the establishment one', async () => {
      const { body } = await draft().expect(200);
      await save(oneSection()).expect(200);
      await publish().expect(201);

      const english = await publicMenu(body.slug, 'en').expect(200);
      expect(english.body.sections[0].name).toBe('Coffee');
      expect(english.body.sections[0].items[0].name).toBe('Black Coffee');

      const fallback = await publicMenu(body.slug, 'de').expect(200);
      expect(fallback.body.sections[0].name).toBe('Cafetería');
    });

    it('should carry the price and allergens of the product, and never its stock', async () => {
      const { body } = await draft().expect(200);
      await save(oneSection()).expect(200);
      await publish().expect(201);

      const { body: published } = await publicMenu(body.slug).expect(200);
      const item = published.sections[0].items[0];

      expect(item.price).toBe(120);
      expect(item.allergens).toEqual(['MILK']);
      expect(JSON.stringify(published)).not.toContain('currentStock');
    });

    it('should stop reporting pending changes once published', async () => {
      await draft().expect(200);
      await save(oneSection()).expect(200);

      await publish().expect(201);

      const { body } = await draft().expect(200);
      expect(body.hasUnpublishedChanges).toBe(false);
      expect(body.publishedAt).toBeTruthy();
    });

    it('should report pending changes when a product on it moves, since customers read the old one', async () => {
      await draft().expect(200);
      await save(oneSection()).expect(200);
      await publish().expect(201);

      await testSetup.prisma.dbProduct.update({ where: { id: productId }, data: { allergens: ['GLUTEN'] } });

      const { body } = await draft().expect(200);
      expect(body.hasUnpublishedChanges).toBe(true);
    });

    it('should carry the product allergens as they are at publish time', async () => {
      await draft().expect(200);
      await save(oneSection()).expect(200);
      await testSetup.prisma.dbProduct.update({ where: { id: productId }, data: { allergens: ['GLUTEN', 'NUTS'] } });

      await publish().expect(201);

      const { body: slug } = await draft().expect(200);
      const { body: published } = await publicMenu(slug.slug).expect(200);

      expect(published.sections[0].items[0].allergens).toEqual(['GLUTEN', 'NUTS']);
    });

    it('should report pending changes again after the draft is touched', async () => {
      await draft().expect(200);
      await save(oneSection()).expect(200);
      await publish().expect(201);

      await save(oneSection({ name: 'Otra carta' })).expect(200);

      const { body } = await draft().expect(200);
      expect(body.hasUnpublishedChanges).toBe(true);
    });

    it('should not change what customers read until it is published again', async () => {
      const { body } = await draft().expect(200);
      await save(oneSection()).expect(200);
      await publish().expect(201);

      await save(oneSection({ sections: [{ translations: { es: { name: 'Cambiada' } }, items: [] }] })).expect(200);

      const { body: stillOld } = await publicMenu(body.slug).expect(200);
      expect(stillOld.sections[0].name).toBe('Cafetería');
    });

    it('should hide the menu again when unpublished', async () => {
      const { body } = await draft().expect(200);
      await save(oneSection()).expect(200);
      await publish().expect(201);

      await request(server()).post(`/api/establishments/${establishmentId}/menu/unpublish`).expect(201);

      await publicMenu(body.slug).expect(404);
    });
  });

  describe('what has run out', () => {
    const markSoldOut = (markSoldOut: boolean) =>
      testSetup.prisma.dbEstablishmentSettings.update({ where: { establishmentId }, data: { markSoldOut } });

    it('should say nothing about stock while the establishment has not asked for it', async () => {
      const { body: menu } = await draft().expect(200);
      await save(oneSection()).expect(200);
      await publish().expect(201);
      await testSetup.prisma.dbProduct.update({ where: { id: productId }, data: { currentStock: 0 } });

      const { body } = await publicMenu(menu.slug).expect(200);

      expect(body.sections[0].items[0].soldOut).toBeUndefined();
    });

    it('should answer stock as it is when the page is read, not as it was when published', async () => {
      await markSoldOut(true);
      const { body: menu } = await draft().expect(200);
      await save(oneSection()).expect(200);
      await testSetup.prisma.dbProduct.update({ where: { id: productId }, data: { currentStock: 10 } });
      await publish().expect(201);

      const { body: whileStocked } = await publicMenu(menu.slug).expect(200);
      expect(whileStocked.sections[0].items[0].soldOut).toBe(false);

      await testSetup.prisma.dbProduct.update({ where: { id: productId }, data: { currentStock: 0 } });

      const { body: afterRunningOut } = await publicMenu(menu.slug).expect(200);
      expect(afterRunningOut.sections[0].items[0].soldOut).toBe(true);
    });
  });

  describe('a line taken off the menu', () => {
    it('should not reach customers, while keeping its wording in the draft', async () => {
      await draft().expect(200);
      const hidden = oneSection();
      hidden.sections[0].items[0].isVisible = false;
      await save(hidden).expect(200);
      await publish().expect(201);

      const { body: menu } = await draft().expect(200);
      expect(menu.sections[0].items[0].isVisible).toBe(false);

      const { body: published } = await publicMenu(menu.slug).expect(200);
      expect(published.sections).toEqual([]);
    });
  });

  describe('the public route', () => {
    it('should 404 an unknown slug rather than leak whether it exists', async () => {
      await publicMenu('no-existe').expect(404);
    });
  });
});
