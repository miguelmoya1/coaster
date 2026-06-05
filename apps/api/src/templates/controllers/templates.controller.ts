import type { ICategoryTemplate, IProductTemplate } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermission, Permissions, PermissionsGuard, UserRoles, UserRolesGuard } from '../../core';
import { DbRole } from '../../db';
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
  @UserRoles(DbRole.ADMIN)
  @UseGuards(UserRolesGuard)
  async createCategoryTemplate(@Body() createCategoryTemplateDto: CreateCategoryTemplateDto): Promise<void> {
    await this._commandBus.execute<CreateCategoryTemplateCommand, void>(
      new CreateCategoryTemplateCommand(createCategoryTemplateDto),
    );
  }

  @Put('categories/:id')
  @UserRoles(DbRole.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateCategoryTemplate(
    @Param('id') id: string,
    @Body() updateCategoryTemplateDto: UpdateCategoryTemplateDto,
  ): Promise<void> {
    await this._commandBus.execute<UpdateCategoryTemplateCommand, void>(
      new UpdateCategoryTemplateCommand(id, updateCategoryTemplateDto),
    );
  }

  @Delete('categories/:id')
  @UserRoles(DbRole.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteCategoryTemplate(@Param('id') id: string): Promise<void> {
    await this._commandBus.execute<DeleteCategoryTemplateCommand, void>(new DeleteCategoryTemplateCommand(id));
  }

  @Get('products')
  async findAllProductTemplates() {
    return this._queryBus.execute<FindAllProductTemplatesQuery, IProductTemplate[]>(new FindAllProductTemplatesQuery());
  }

  @Post('products')
  @UserRoles(DbRole.ADMIN)
  @UseGuards(UserRolesGuard)
  async createProductTemplate(@Body() createProductTemplateDto: CreateProductTemplateDto): Promise<void> {
    await this._commandBus.execute<CreateProductTemplateCommand, void>(
      new CreateProductTemplateCommand(createProductTemplateDto),
    );
  }

  @Put('products/:id')
  @UserRoles(DbRole.ADMIN)
  @UseGuards(UserRolesGuard)
  async updateProductTemplate(
    @Param('id') id: string,
    @Body() updateProductTemplateDto: UpdateProductTemplateDto,
  ): Promise<void> {
    await this._commandBus.execute<UpdateProductTemplateCommand, void>(
      new UpdateProductTemplateCommand(id, updateProductTemplateDto),
    );
  }

  @Delete('products/:id')
  @UserRoles(DbRole.ADMIN)
  @UseGuards(UserRolesGuard)
  async deleteProductTemplate(@Param('id') id: string): Promise<void> {
    await this._commandBus.execute<DeleteProductTemplateCommand, void>(new DeleteProductTemplateCommand(id));
  }

  @Post('bar/:barId')
  @Permissions(BarPermission.IMPORT_TEMPLATES)
  @UseGuards(PermissionsGuard)
  async importTemplatesToBar(@Param('barId') barId: string, @Body() importDto: ImportTemplatesDto): Promise<void> {
    await this._commandBus.execute<ImportTemplatesToBarCommand, void>(
      new ImportTemplatesToBarCommand(barId, importDto),
    );
  }

  @Post('bulk')
  @UserRoles(DbRole.ADMIN)
  @UseGuards(UserRolesGuard)
  async bulkUpsertTemplates(@Body() body: BulkCategoryTemplateInput[]): Promise<void> {
    await this._commandBus.execute<BulkUpsertTemplatesCommand, void>(new BulkUpsertTemplatesCommand(body));
  }
}
