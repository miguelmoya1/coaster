import { BarId, BarRole } from '@coaster/interfaces';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { CategoriesService } from '../services/categories.service';

@Controller('bars/:barId/categories')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly _categoriesService: CategoriesService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  getCategories(@Param('barId') barId: BarId) {
    return this._categoriesService.getCategoriesWithProducts(barId);
  }

  @Post()
  @Roles(BarRole.OWNER)
  createCategory(@Param('barId') barId: BarId, @Body() dto: CreateCategoryDto) {
    return this._categoriesService.createCategory(barId, dto);
  }
}
