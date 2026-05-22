import { BarRole, Role } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard, UserRoles, UserRolesGuard } from '../../core';
import { CreateCategoryTemplateDto } from '../dto/create-category-template.dto';
import { CreateProductTemplateDto } from '../dto/create-product-template.dto';
import { ImportTemplatesDto } from '../dto/import-templates.dto';
import { UpdateCategoryTemplateDto } from '../dto/update-category-template.dto';
import { UpdateProductTemplateDto } from '../dto/update-product-template.dto';
import { BulkCategoryTemplateInput, TemplatesService } from '../services/templates.service';

@Controller('templates')
@UseGuards(FirebaseAuthGuard)
export class TemplatesController {
  constructor(private readonly _templatesService: TemplatesService) {}

  @Get('categories')
  async findAllCategoryTemplates() {
    return this._templatesService.findAllCategoryTemplates();
  }

  @Post('categories')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async createCategoryTemplate(@Body() createCategoryTemplateDto: CreateCategoryTemplateDto) {
    return this._templatesService.createCategoryTemplate(createCategoryTemplateDto);
  }

  @Put('categories/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateCategoryTemplate(@Param('id') id: string, @Body() updateCategoryTemplateDto: UpdateCategoryTemplateDto) {
    return this._templatesService.updateCategoryTemplate(id, updateCategoryTemplateDto);
  }

  @Delete('categories/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteCategoryTemplate(@Param('id') id: string) {
    return this._templatesService.deleteCategoryTemplate(id);
  }

  @Get('products')
  async findAllProductTemplates() {
    return this._templatesService.findAllProductTemplates();
  }

  @Post('products')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async createProductTemplate(@Body() createProductTemplateDto: CreateProductTemplateDto) {
    return this._templatesService.createProductTemplate(createProductTemplateDto);
  }

  @Put('products/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateProductTemplate(@Param('id') id: string, @Body() updateProductTemplateDto: UpdateProductTemplateDto) {
    return this._templatesService.updateProductTemplate(id, updateProductTemplateDto);
  }

  @Delete('products/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteProductTemplate(@Param('id') id: string) {
    return this._templatesService.deleteProductTemplate(id);
  }

  @Post('bar/:barId')
  @Roles(BarRole.OWNER)
  @UseGuards(RolesGuard)
  async importTemplatesToBar(@Param('barId') barId: string, @Body() importDto: ImportTemplatesDto) {
    return this._templatesService.importTemplatesToBar(barId, importDto);
  }

  @Post('bulk')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async bulkUpsertTemplates(@Body() body: BulkCategoryTemplateInput[]) {
    return this._templatesService.bulkUpsertTemplates(body);
  }
}
