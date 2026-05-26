import { BarRole, Role, type ICategoryTemplate, type IProductTemplate } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { FirebaseAuthGuard, Roles, RolesGuard, UserRoles, UserRolesGuard } from '../../core';
import {
  BulkCategoryTemplateInput,
  BulkUpsertTemplatesCommand,
  CreateCategoryTemplateCommand,
  CreateProductTemplateCommand,
  DeleteCategoryTemplateCommand,
  DeleteProductTemplateCommand,
  ImportTemplatesToBarCommand,
  UpdateCategoryTemplateCommand,
  UpdateProductTemplateCommand,
} from '../commands';
import { CreateCategoryTemplateDto } from '../dto/create-category-template.dto';
import { CreateProductTemplateDto } from '../dto/create-product-template.dto';
import { ImportTemplatesDto } from '../dto/import-templates.dto';
import { UpdateCategoryTemplateDto } from '../dto/update-category-template.dto';
import { UpdateProductTemplateDto } from '../dto/update-product-template.dto';
import { FindAllCategoryTemplatesQuery, FindAllProductTemplatesQuery } from '../queries';

@Controller('templates')
@UseGuards(FirebaseAuthGuard)
export class TemplatesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('categories')
  async findAllCategoryTemplates() {
    return this._queryBus.execute<FindAllCategoryTemplatesQuery, ICategoryTemplate[]>(
      new FindAllCategoryTemplatesQuery(),
    );
  }

  @Post('categories')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async createCategoryTemplate(@Body() createCategoryTemplateDto: CreateCategoryTemplateDto) {
    return this._commandBus.execute<CreateCategoryTemplateCommand, { id: string }>(
      new CreateCategoryTemplateCommand(createCategoryTemplateDto),
    );
  }

  @Put('categories/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateCategoryTemplate(@Param('id') id: string, @Body() updateCategoryTemplateDto: UpdateCategoryTemplateDto) {
    return this._commandBus.execute<UpdateCategoryTemplateCommand, void>(
      new UpdateCategoryTemplateCommand(id, updateCategoryTemplateDto),
    );
  }

  @Delete('categories/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteCategoryTemplate(@Param('id') id: string) {
    return this._commandBus.execute<DeleteCategoryTemplateCommand, void>(new DeleteCategoryTemplateCommand(id));
  }

  @Get('products')
  async findAllProductTemplates() {
    return this._queryBus.execute<FindAllProductTemplatesQuery, IProductTemplate[]>(new FindAllProductTemplatesQuery());
  }

  @Post('products')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async createProductTemplate(@Body() createProductTemplateDto: CreateProductTemplateDto) {
    return this._commandBus.execute<CreateProductTemplateCommand, { id: string }>(
      new CreateProductTemplateCommand(createProductTemplateDto),
    );
  }

  @Put('products/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateProductTemplate(@Param('id') id: string, @Body() updateProductTemplateDto: UpdateProductTemplateDto) {
    return this._commandBus.execute<UpdateProductTemplateCommand, void>(
      new UpdateProductTemplateCommand(id, updateProductTemplateDto),
    );
  }

  @Delete('products/:id')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteProductTemplate(@Param('id') id: string) {
    return this._commandBus.execute<DeleteProductTemplateCommand, void>(new DeleteProductTemplateCommand(id));
  }

  @Post('bar/:barId')
  @Roles(BarRole.OWNER)
  @UseGuards(RolesGuard)
  async importTemplatesToBar(@Param('barId') barId: string, @Body() importDto: ImportTemplatesDto) {
    return this._commandBus.execute<
      ImportTemplatesToBarCommand,
      { success: boolean; created: number; modified: number }
    >(new ImportTemplatesToBarCommand(barId, importDto));
  }

  @Post('bulk')
  @UserRoles(Role.ADMIN)
  @UseGuards(UserRolesGuard)
  async bulkUpsertTemplates(@Body() body: BulkCategoryTemplateInput[]) {
    return this._commandBus.execute<BulkUpsertTemplatesCommand, void>(new BulkUpsertTemplatesCommand(body));
  }
}
