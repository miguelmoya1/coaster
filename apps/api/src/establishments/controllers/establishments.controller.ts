import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { Establishment, EstablishmentId, User } from '@coaster/common';
import { EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateEstablishmentCommand } from '../commands';
import { CreateEstablishmentDto } from '../dto/create-establishment.dto';
import { EstablishmentsMapper } from '../mappers/establishments.mapper';
import { GetEstablishmentByIdQuery, GetEstablishmentsForUserQuery } from '../queries';

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
