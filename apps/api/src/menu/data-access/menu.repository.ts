import type { EstablishmentId, Language, MenuId, MenuSectionDraft } from '@coaster/common';
import { DbService, Prisma } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

const DRAFT = {
  sections: {
    orderBy: { position: 'asc' },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: {
          product: {
            select: { name: true, price: true, imageUrl: true, allergens: true, deletedAt: true, updatedAt: true },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class MenuRepository {
  constructor(private readonly _db: DbService) {}

  public establishmentFor(establishmentId: EstablishmentId) {
    return this._db.dbEstablishment.findUnique({
      where: { id: establishmentId },
      select: { name: true, settings: { select: { language: true } } },
    });
  }

  public findByEstablishmentId(establishmentId: EstablishmentId) {
    return this._db.dbMenu.findFirst({ where: { establishmentId }, include: DRAFT });
  }

  public findPublishedBySlug(slug: string) {
    return this._db.dbMenu.findUnique({
      where: { slug },
      select: {
        publishedSnapshot: true,
        publishedAt: true,
        languages: true,
        defaultLanguage: true,
        establishment: { select: { settings: { select: { markSoldOut: true } } } },
      },
    });
  }

  public async soldOutAmong(productIds: string[]): Promise<Set<string>> {
    if (productIds.length === 0) {
      return new Set();
    }

    const empty = await this._db.dbProduct.findMany({
      where: { id: { in: productIds }, currentStock: { lte: 0 } },
      select: { id: true },
    });

    return new Set(empty.map((product) => product.id));
  }

  public takenSlugs(roots: string[]) {
    return this._db.dbMenu
      .findMany({ where: { OR: roots.map((root) => ({ slug: { startsWith: root } })) }, select: { slug: true } })
      .then((menus) => menus.map((menu) => menu.slug));
  }

  public create(establishmentId: EstablishmentId, slug: string, name: string, language: Language) {
    return this._db.dbMenu.create({
      data: { establishmentId, slug, name, defaultLanguage: language, languages: [language] },
      include: DRAFT,
    });
  }

  public async replaceDraft(menuId: MenuId, name: string, languages: Language[], sections: MenuSectionDraft[]) {
    return this._db.$transaction(async (tx) => {
      await tx.dbMenuSection.deleteMany({ where: { menuId } });

      await tx.dbMenu.update({ where: { id: menuId }, data: { name, languages } });

      for (const [position, section] of sections.entries()) {
        await tx.dbMenuSection.create({
          data: {
            menuId,
            position,
            translations: section.translations as Prisma.InputJsonValue,
            items: {
              create: section.items.map((item, itemPosition) => ({
                position: itemPosition,
                productId: item.productId ?? null,
                price: item.price ?? null,
                isVisible: item.isVisible !== false,
                translations: item.translations as Prisma.InputJsonValue,
              })),
            },
          },
        });
      }

      return tx.dbMenu.findUniqueOrThrow({ where: { id: menuId }, include: DRAFT });
    });
  }

  public publish(menuId: MenuId, snapshot: Prisma.InputJsonValue) {
    const now = new Date();

    return this._db.dbMenu.update({
      where: { id: menuId },
      data: { publishedSnapshot: snapshot, publishedAt: now, updatedAt: now },
    });
  }

  public unpublish(menuId: MenuId) {
    return this._db.dbMenu.update({
      where: { id: menuId },
      data: { publishedSnapshot: Prisma.DbNull, publishedAt: null },
    });
  }

  public productsOf(establishmentId: EstablishmentId, productIds: string[]) {
    return this._db.dbProduct.findMany({
      where: { id: { in: productIds }, deletedAt: null, category: { establishmentId } },
      select: { id: true },
    });
  }
}
