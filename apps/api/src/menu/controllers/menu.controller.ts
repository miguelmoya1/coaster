import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, MenuDraft, SaveMenuDraftDto as SaveMenuDraft } from '@coaster/common';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import {
  EstablishmentModulesGuard,
  EstablishmentPermissions,
  EstablishmentPermissionsGuard,
  RequiresModule,
} from '@coaster/core';
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PublishMenuCommand, SaveMenuDraftCommand } from '../commands';
import { SaveMenuDraftDto } from '../dto/save-menu-draft.dto';
import { GetMenuDraftQuery } from '../queries';

@Controller('establishments/:establishmentId/menu')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard, EstablishmentModulesGuard)
@RequiresModule(EstablishmentModule.INVENTORY)
export class MenuController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)
  async getDraft(@Param('establishmentId') establishmentId: EstablishmentId) {
    return this._queryBus.execute<GetMenuDraftQuery, MenuDraft>(new GetMenuDraftQuery(establishmentId));
  }

  @Put()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_MENU)
  async saveDraft(@Param('establishmentId') establishmentId: EstablishmentId, @Body() dto: SaveMenuDraftDto) {
    return this._commandBus.execute<SaveMenuDraftCommand, MenuDraft>(
      new SaveMenuDraftCommand(establishmentId, dto as unknown as SaveMenuDraft),
    );
  }

  @Post('publish')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_MENU)
  async publish(@Param('establishmentId') establishmentId: EstablishmentId): Promise<void> {
    await this._commandBus.execute<PublishMenuCommand, void>(new PublishMenuCommand(establishmentId, true));
  }

  @Post('unpublish')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_MENU)
  async unpublish(@Param('establishmentId') establishmentId: EstablishmentId): Promise<void> {
    await this._commandBus.execute<PublishMenuCommand, void>(new PublishMenuCommand(establishmentId, false));
  }
}
