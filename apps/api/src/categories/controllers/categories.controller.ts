import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, Category, CategoryId } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard, commonMapper } from '@coaster/core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCategoryCommand, DeleteCategoryCommand, UpdateCategoryCommand } from '../commands';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesMapper } from '../mappers/categories.mapper';
import { GetCategoriesQuery } from '../queries';

@Controller('establishments/:establishmentId/categories')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class CategoriesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_CATEGORIES)
  async getCategories(@Param('establishmentId') establishmentId: EstablishmentId) {
    const categories = await this._queryBus.execute<GetCategoriesQuery, Category[]>(
      new GetCategoriesQuery(establishmentId),
    );
    return categories.map((category) => CategoriesMapper.toDto(category));
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CREATE_CATEGORY)
  async createCategory(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CreateCategoryDto,
  ): Promise<void> {
    await this._commandBus.execute<CreateCategoryCommand, void>(new CreateCategoryCommand(establishmentId, dto));
  }

  @Patch(':categoryId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_CATEGORY)
  async updateCategory(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('categoryId') categoryId: CategoryId,
    @Body() dto: UpdateCategoryDto,
  ): Promise<void> {
    await this._commandBus.execute<UpdateCategoryCommand, void>(
      new UpdateCategoryCommand(establishmentId, categoryId, dto),
    );
  }

  @Delete(':categoryId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_DELETE_CATEGORY)
  async deleteCategory(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('categoryId') categoryId: CategoryId,
  ) {
    await this._commandBus.execute<DeleteCategoryCommand, void>(new DeleteCategoryCommand(establishmentId, categoryId));
    return commonMapper.getSuccessResponse();
  }
}
