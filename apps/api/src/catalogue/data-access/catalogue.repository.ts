import type { EstablishmentId, Language } from '@coaster/common';
import { asLanguage } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogueRepository {
  constructor(private readonly _db: DbService) {}

  public async languageOf(establishmentId: EstablishmentId): Promise<Language> {
    const settings = await this._db.dbEstablishmentSettings.findUnique({
      where: { establishmentId },
      select: { language: true },
    });

    return asLanguage(settings?.language);
  }

  public findCategoriesByName(establishmentId: EstablishmentId, names: string[]) {
    return this._db.dbCategory.findMany({
      where: { establishmentId, deletedAt: null, name: { in: names } },
      select: { id: true, name: true },
    });
  }

  public findProductNames(categoryIds: string[]) {
    return this._db.dbProduct.findMany({
      where: { categoryId: { in: categoryIds }, deletedAt: null },
      select: { categoryId: true, name: true },
    });
  }

  public createCategories(data: { establishmentId: string; name: string; icon: string | null }[]) {
    return this._db.dbCategory.createMany({ data, skipDuplicates: true });
  }

  public createProducts(data: { categoryId: string; name: string; price: number }[]) {
    return this._db.dbProduct.createMany({ data, skipDuplicates: true });
  }
}
