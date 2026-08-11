import type { MenuDraft } from '@coaster/common';
import { asLanguage, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MenuRepository } from '../../data-access/menu.repository';
import { nextSlug, slugify } from '../../domain/menu-slug';
import { MenuMapper } from '../../mappers/menu.mapper';
import { GetMenuDraftQuery } from '../impl/get-menu-draft.query';

@QueryHandler(GetMenuDraftQuery)
export class GetMenuDraftHandler implements IQueryHandler<GetMenuDraftQuery, MenuDraft> {
  constructor(private readonly repository: MenuRepository) {}

  /** An establishment that has never opened the editor has no menu row; reading one starts it. */
  async execute(query: GetMenuDraftQuery): Promise<MenuDraft> {
    const existing = await this.repository.findByEstablishmentId(query.establishmentId);

    if (existing) {
      return MenuMapper.toDraft(existing);
    }

    const establishment = await this.repository.establishmentFor(query.establishmentId);

    if (!establishment) {
      throw new NotFoundException(ErrorCodes.ESTABLISHMENT_NOT_FOUND);
    }

    const root = slugify(establishment.name) || 'menu';
    const taken = await this.repository.takenSlugs([root]);
    const created = await this.repository.create(
      query.establishmentId,
      nextSlug(establishment.name, taken),
      establishment.name,
      asLanguage(establishment.settings?.language),
    );

    return MenuMapper.toDraft(created);
  }
}
