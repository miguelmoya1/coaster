import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { Establishment, EstablishmentId, EstablishmentSettings, User } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateEstablishmentCommand, UpdateEstablishmentSettingsCommand } from '../commands';
import { CreateEstablishmentDto } from '../dto/create-establishment.dto';
import { UpdateEstablishmentSettingsDto } from '../dto/update-establishment-settings.dto';
import { EstablishmentsMapper } from '../mappers/establishments.mapper';
import { GetEstablishmentByIdQuery, GetEstablishmentSettingsQuery, GetEstablishmentsForUserQuery } from '../queries';

@Controller('establishments')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class EstablishmentsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post()
  async createEstablishment(
    @Body() createEstablishmentDto: CreateEstablishmentDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this._commandBus.execute<CreateEstablishmentCommand, void>(
      new CreateEstablishmentCommand(createEstablishmentDto, user),
    );
  }

  @Get()
  async getEstablishments(@CurrentUser() user: User): Promise<Establishment[]> {
    const establishments = await this._queryBus.execute<GetEstablishmentsForUserQuery, Establishment[]>(
      new GetEstablishmentsForUserQuery(user),
    );
    return establishments.map((b) => EstablishmentsMapper.toDto(b));
  }

  @Get(':establishmentId/settings')
  async getSettings(@Param('establishmentId') establishmentId: EstablishmentId): Promise<EstablishmentSettings> {
    return this._queryBus.execute<GetEstablishmentSettingsQuery, EstablishmentSettings>(
      new GetEstablishmentSettingsQuery(establishmentId),
    );
  }

  @Patch(':establishmentId/settings')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_SETTINGS)
  async updateSettings(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: UpdateEstablishmentSettingsDto,
  ): Promise<EstablishmentSettings> {
    return this._commandBus.execute<UpdateEstablishmentSettingsCommand, EstablishmentSettings>(
      new UpdateEstablishmentSettingsCommand(establishmentId, dto.modules),
    );
  }

  @Get(':establishmentId')
  async getEstablishment(@Param('establishmentId') establishmentId: EstablishmentId): Promise<Establishment | null> {
    const establishment = await this._queryBus.execute<GetEstablishmentByIdQuery, Establishment | null>(
      new GetEstablishmentByIdQuery(establishmentId),
    );
    if (!establishment) {
      return null;
    }

    return EstablishmentsMapper.toDto(establishment);
  }
}
