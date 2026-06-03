import type { BarId, Category, CategoryId } from '@coaster/common';
import { BarPermission } from '../../core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { commonMapper, FirebaseAuthGuard, Permissions, PermissionsGuard } from '../../core';
import { CreateCategoryCommand, DeleteCategoryCommand, UpdateCategoryCommand } from '../commands';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesMapper } from '../mappers/categories.mapper';
import { GetCategoriesQuery } from '../queries';

@Controller('bars/:barId/categories')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Permissions(BarPermission.VIEW_CATEGORIES)
  async getCategories(@Param('barId') barId: BarId) {
    const categories = await this._queryBus.execute<GetCategoriesQuery, Category[]>(new GetCategoriesQuery(barId));
    return categories.map((category) => CategoriesMapper.toDto(category));
  }

  @Post()
  @Permissions(BarPermission.CREATE_CATEGORY)
  async createCategory(@Param('barId') barId: BarId, @Body() dto: CreateCategoryDto) {
    const category = await this._commandBus.execute<CreateCategoryCommand, Category>(
      new CreateCategoryCommand(barId, dto),
    );
    return CategoriesMapper.toDto(category);
  }

  @Patch(':categoryId')
  @Permissions(BarPermission.UPDATE_CATEGORY)
  async updateCategory(
    @Param('barId') barId: BarId,
    @Param('categoryId') categoryId: CategoryId,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this._commandBus.execute<UpdateCategoryCommand, Category>(
      new UpdateCategoryCommand(barId, categoryId, dto),
    );
    return CategoriesMapper.toDto(category);
  }

  @Delete(':categoryId')
  @Permissions(BarPermission.DELETE_CATEGORY)
  async deleteCategory(@Param('barId') barId: BarId, @Param('categoryId') categoryId: CategoryId) {
    await this._commandBus.execute<DeleteCategoryCommand, void>(new DeleteCategoryCommand(barId, categoryId));
    return commonMapper.getSuccessResponse();
  }
}
