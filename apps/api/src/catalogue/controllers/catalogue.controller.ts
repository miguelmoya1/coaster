import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, StarterCatalogueCategory } from '@coaster/common';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import {
  EstablishmentModulesGuard,
  EstablishmentPermissions,
  EstablishmentPermissionsGuard,
  RequiresModule,
} from '@coaster/core';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ImportStarterCatalogueCommand } from '../commands';
import { ImportStarterCatalogueDto } from '../dto/import-starter-catalogue.dto';
import { GetStarterCatalogueQuery } from '../queries';

@Controller('establishments/:establishmentId/catalogue')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard, EstablishmentModulesGuard)
@RequiresModule(EstablishmentModule.INVENTORY)
@EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_IMPORT_CATALOGUE)
export class CatalogueController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  async getStarterCatalogue(@Param('establishmentId') establishmentId: EstablishmentId) {
    return this._queryBus.execute<GetStarterCatalogueQuery, StarterCatalogueCategory[]>(
      new GetStarterCatalogueQuery(establishmentId),
    );
  }

  @Post('import')
  async importStarterCatalogue(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: ImportStarterCatalogueDto,
  ): Promise<void> {
    await this._commandBus.execute<ImportStarterCatalogueCommand, void>(
      new ImportStarterCatalogueCommand(establishmentId, dto),
    );
  }
}
