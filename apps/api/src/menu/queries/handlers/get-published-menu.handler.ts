import type { Language, PublishedMenu } from '@coaster/common';
import { asLanguage, ErrorCodes, isLanguage } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MenuRepository } from '../../data-access/menu.repository';
import { GetPublishedMenuQuery } from '../impl/get-published-menu.query';

@QueryHandler(GetPublishedMenuQuery)
export class GetPublishedMenuHandler implements IQueryHandler<GetPublishedMenuQuery, PublishedMenu> {
  constructor(private readonly repository: MenuRepository) {}

  /** Never published is a 404, not an empty menu: there is nothing here to read yet. */
  async execute(query: GetPublishedMenuQuery): Promise<PublishedMenu> {
    const menu = await this.repository.findPublishedBySlug(query.slug);

    if (!menu?.publishedSnapshot) {
      throw new NotFoundException(ErrorCodes.MENU_NOT_FOUND);
    }

    const snapshot = menu.publishedSnapshot as unknown as Record<string, PublishedMenu>;
    const asked = query.language;
    const language: Language =
      asked && isLanguage(asked) && snapshot[asked] ? asked : asLanguage(menu.defaultLanguage);

    const published = snapshot[language] ?? snapshot[asLanguage(menu.defaultLanguage)];

    if (!menu.establishment?.settings?.markSoldOut) {
      return published;
    }

    const productIds = published.sections
      .flatMap((section) => section.items)
      .map((item) => item.productId)
      .filter((productId): productId is NonNullable<typeof productId> => Boolean(productId));

    const soldOut = await this.repository.soldOutAmong(productIds);

    return {
      ...published,
      sections: published.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          soldOut: Boolean(item.productId && soldOut.has(item.productId)),
        })),
      })),
    };
  }
}
