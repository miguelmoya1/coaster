import type { MenuDraft, MenuId } from '@coaster/common';
import { asLanguage, ErrorCodes } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MenuRepository } from '../../data-access/menu.repository';
import { sanitiseTranslations } from '../../domain/sanitise-wording';
import { MenuMapper } from '../../mappers/menu.mapper';
import { SaveMenuDraftCommand } from '../impl/save-menu-draft.command';

@CommandHandler(SaveMenuDraftCommand)
export class SaveMenuDraftHandler implements ICommandHandler<SaveMenuDraftCommand, MenuDraft> {
  constructor(private readonly repository: MenuRepository) {}

  async execute(command: SaveMenuDraftCommand): Promise<MenuDraft> {
    const menu = await this.repository.findByEstablishmentId(command.establishmentId);

    if (!menu) {
      throw new NotFoundException(ErrorCodes.MENU_NOT_FOUND);
    }

    const languages = command.dto.languages.map(asLanguage);
    const defaultLanguage = asLanguage(menu.defaultLanguage);

    // Every fallback lands on the menu's own language, so a menu that does not offer it has lines
    // with nothing to fall back to.
    if (!languages.includes(defaultLanguage)) {
      throw new BadRequestException(ErrorCodes.MENU_LANGUAGE_NOT_OFFERED);
    }

    const referenced = command.dto.sections
      .flatMap((section) => section.items)
      .map((item) => item.productId)
      .filter((productId): productId is NonNullable<typeof productId> => Boolean(productId));

    if (referenced.length > 0) {
      const owned = await this.repository.productsOf(command.establishmentId, referenced);
      const ownedIds = new Set(owned.map((product) => product.id));

      if (referenced.some((productId) => !ownedIds.has(productId))) {
        throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
      }
    }

    const offered = [...new Set(languages)];
    const sections = command.dto.sections.map((section) => ({
      translations: sanitiseTranslations(section.translations, offered),
      items: section.items.map((item) => ({
        productId: item.productId,
        price: item.price,
        translations: sanitiseTranslations(item.translations, offered),
      })),
    }));

    const saved = await this.repository.replaceDraft(
      menu.id as MenuId,
      command.dto.name.trim(),
      offered,
      sections,
    );

    return MenuMapper.toDraft(saved);
  }
}
