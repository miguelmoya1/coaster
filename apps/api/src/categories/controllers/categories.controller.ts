import { type BarId, BarRole, type CategoryId } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { commonMapper, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesMapper } from '../mappers/categories.mapper';
import { GetCategoriesQuery } from '../queries';
import { CreateCategoryCommand, UpdateCategoryCommand, DeleteCategoryCommand } from '../commands';

@Controller('bars/:barId/categories')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getCategories(@Param('barId') barId: BarId) {
    const categories = await this._queryBus.execute<GetCategoriesQuery, any[]>(new GetCategoriesQuery(barId));
    return categories.map((category) => CategoriesMapper.toDto(category));
  }

  @Post()
  @Roles(BarRole.OWNER)
  async createCategory(@Param('barId') barId: BarId, @Body() dto: CreateCategoryDto) {
    const category = await this._commandBus.execute<CreateCategoryCommand, any>(new CreateCategoryCommand(barId, dto));
    return CategoriesMapper.toDto(category);
  }

  @Patch(':categoryId')
  @Roles(BarRole.OWNER)
  async updateCategory(
    @Param('barId') barId: BarId,
    @Param('categoryId') categoryId: CategoryId,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this._commandBus.execute<UpdateCategoryCommand, any>(new UpdateCategoryCommand(barId, categoryId, dto));
    return CategoriesMapper.toDto(category);
  }

  @Delete(':categoryId')
  @Roles(BarRole.OWNER)
  async deleteCategory(@Param('barId') barId: BarId, @Param('categoryId') categoryId: CategoryId) {
    await this._commandBus.execute<DeleteCategoryCommand, void>(new DeleteCategoryCommand(barId, categoryId));
    return commonMapper.getSuccessResponse();
  }
}
