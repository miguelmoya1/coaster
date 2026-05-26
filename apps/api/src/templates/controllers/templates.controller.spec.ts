import { asCategoryId } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

import { FirebaseAuthGuard, RolesGuard, UserRolesGuard } from '../../core';
import {
  BulkUpsertTemplatesCommand,
  CreateCategoryTemplateCommand,
  CreateProductTemplateCommand,
  DeleteCategoryTemplateCommand,
  DeleteProductTemplateCommand,
  ImportTemplatesToBarCommand,
  UpdateCategoryTemplateCommand,
  UpdateProductTemplateCommand,
} from '../commands';
import { FindAllCategoryTemplatesQuery, FindAllProductTemplatesQuery } from '../queries';
import { TemplatesController } from './templates.controller';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(UserRolesGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TemplatesController>(TemplatesController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('findAllCategoryTemplates should delegate to the query bus', async () => {
    queryBus.execute.mockResolvedValue([]);
    await controller.findAllCategoryTemplates();
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(FindAllCategoryTemplatesQuery));
  });

  it('createCategoryTemplate should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue({ id: 'cat-t1' });
    const dto = { name: 'Category 1', description: 'Desc 1' };
    await controller.createCategoryTemplate(dto);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateCategoryTemplateCommand));
  });

  it('updateCategoryTemplate should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { name: 'Updated Name', description: 'Updated Desc' };
    await controller.updateCategoryTemplate('cat-t1', dto);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateCategoryTemplateCommand));
  });

  it('deleteCategoryTemplate should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    await controller.deleteCategoryTemplate('cat-t1');
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteCategoryTemplateCommand));
  });

  it('findAllProductTemplates should delegate to the query bus', async () => {
    queryBus.execute.mockResolvedValue([]);
    await controller.findAllProductTemplates();
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(FindAllProductTemplatesQuery));
  });

  it('createProductTemplate should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue({ id: 'prod-t1' });
    const dto = {
      name: 'Prod 1',
      price: 10,
      categoryTemplateId: asCategoryId('cat-t1'),
      categoryId: asCategoryId('cat-1'),
    };
    await controller.createProductTemplate(dto);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateProductTemplateCommand));
  });

  it('updateProductTemplate should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { name: 'Updated Prod', price: 12 };
    await controller.updateProductTemplate('prod-t1', dto);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateProductTemplateCommand));
  });

  it('deleteProductTemplate should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    await controller.deleteProductTemplate('prod-t1');
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteProductTemplateCommand));
  });

  it('importTemplatesToBar should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue({ success: true, created: 2, modified: 1 });
    const dto = { categoryTemplateIds: ['cat-t1'], productTemplateIds: ['prod-t1'] };
    await controller.importTemplatesToBar('bar-1', dto);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(ImportTemplatesToBarCommand));
  });

  it('bulkUpsertTemplates should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const body = [{ name: 'Cat 1', products: [{ name: 'Prod 1', price: 5 }] }];
    await controller.bulkUpsertTemplates(body);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(BulkUpsertTemplatesCommand));
  });
});
