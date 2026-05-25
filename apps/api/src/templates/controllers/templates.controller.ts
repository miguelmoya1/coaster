import { BarRole, Role } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard, Roles, RolesGuard, UserRoles, UserRolesGuard } from '../../core';
import { CreateCategoryTemplateDto } from '../dto/create-category-template.dto';
import { CreateProductTemplateDto } from '../dto/create-product-template.dto';
import { ImportTemplatesDto } from '../dto/import-templates.dto';
import { UpdateCategoryTemplateDto } from '../dto/update-category-template.dto';
import { UpdateProductTemplateDto } from '../dto/update-product-template.dto';
import { FindAllCategoryTemplatesQuery, FindAllProductTemplatesQuery } from '../queries';
import {
  CreateCategoryTemplateCommand,
  UpdateCategoryTemplateCommand,
  DeleteCategoryTemplateCommand,
  CreateProductTemplateCommand,
  UpdateProductTemplateCommand,
  DeleteProductTemplateCommand,
  ImportTemplatesToBarCommand,
  BulkUpsertTemplatesCommand,
  BulkCategoryTemplateInput
} from '../commands';

@Controller('templates')
@UseGuards(FirebaseAuthGuard)
export class TemplatesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('categories')
  async findAllCategoryTemplates() {
    return this._queryBus.execute(new FindAllCategoryTemplatesQuery());
  }

  @Post('categories')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async createCategoryTemplate(@Body() createCategoryTemplateDto: CreateCategoryTemplateDto) {
    return this._commandBus.execute(new CreateCategoryTemplateCommand(createCategoryTemplateDto));
  }

  @Put('categories/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateCategoryTemplate(@Param('id') id: string, @Body() updateCategoryTemplateDto: UpdateCategoryTemplateDto) {
    return this._commandBus.execute(new UpdateCategoryTemplateCommand(id, updateCategoryTemplateDto));
  }

  @Delete('categories/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteCategoryTemplate(@Param('id') id: string) {
    return this._commandBus.execute(new DeleteCategoryTemplateCommand(id));
  }

  @Get('products')
  async findAllProductTemplates() {
    return this._queryBus.execute(new FindAllProductTemplatesQuery());
  }

  @Post('products')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async createProductTemplate(@Body() createProductTemplateDto: CreateProductTemplateDto) {
    return this._commandBus.execute(new CreateProductTemplateCommand(createProductTemplateDto));
  }

  @Put('products/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateProductTemplate(@Param('id') id: string, @Body() updateProductTemplateDto: UpdateProductTemplateDto) {
    return this._commandBus.execute(new UpdateProductTemplateCommand(id, updateProductTemplateDto));
  }

  @Delete('products/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteProductTemplate(@Param('id') id: string) {
    return this._commandBus.execute(new DeleteProductTemplateCommand(id));
  }

  @Post('bar/:barId')
  @Roles(BarRole.OWNER)
  @UseGuards(RolesGuard)
  async importTemplatesToBar(@Param('barId') barId: string, @Body() importDto: ImportTemplatesDto) {
    return this._commandBus.execute(new ImportTemplatesToBarCommand(barId, importDto));
  }

  @Post('bulk')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async bulkUpsertTemplates(@Body() body: BulkCategoryTemplateInput[]) {
    return this._commandBus.execute(new BulkUpsertTemplatesCommand(body));
  }
}
