import { type BarId, BarRole, type CategoryId } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { commonMapper, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesMapper } from '../mappers/categories.mapper';
import { CategoriesService } from '../services/categories.service';

@Controller('bars/:barId/categories')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly _categoriesService: CategoriesService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getCategories(@Param('barId') barId: BarId) {
    const categories = await this._categoriesService.getCategories(barId);
    return categories.map(CategoriesMapper.toDto);
  }

  @Post()
  @Roles(BarRole.OWNER)
  async createCategory(@Param('barId') barId: BarId, @Body() dto: CreateCategoryDto) {
    const category = await this._categoriesService.createCategory(barId, dto);
    return CategoriesMapper.toDto(category);
  }

  @Patch(':categoryId')
  @Roles(BarRole.OWNER)
  async updateCategory(
    @Param('barId') barId: BarId,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this._categoriesService.updateCategory(barId, categoryId, dto);
    return CategoriesMapper.toDto(category);
  }

  @Delete(':categoryId')
  @Roles(BarRole.OWNER)
  async deleteCategory(@Param('barId') barId: BarId, @Param('categoryId') categoryId: CategoryId) {
    await this._categoriesService.deleteCategory(barId, categoryId);
    return commonMapper.getSuccessResponse();
  }
}
