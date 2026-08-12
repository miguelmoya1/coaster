import type { MenuId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@coaster/core/db';
import { MenuRepository } from '../../data-access/menu.repository';
import { renderEveryLanguage } from '../../domain/render-menu';
import { MenuMapper } from '../../mappers/menu.mapper';
import { PublishMenuCommand } from '../impl/publish-menu.command';

@CommandHandler(PublishMenuCommand)
export class PublishMenuHandler implements ICommandHandler<PublishMenuCommand, void> {
  constructor(private readonly repository: MenuRepository) {}

  async execute(command: PublishMenuCommand): Promise<void> {
    const menu = await this.repository.findByEstablishmentId(command.establishmentId);

    if (!menu) {
      throw new NotFoundException(ErrorCodes.MENU_NOT_FOUND);
    }

    if (!command.published) {
      await this.repository.unpublish(menu.id as MenuId);
      return;
    }

    const snapshot = renderEveryLanguage(MenuMapper.toRenderable(menu));

    await this.repository.publish(menu.id as MenuId, snapshot as unknown as Prisma.InputJsonValue);
  }
}
