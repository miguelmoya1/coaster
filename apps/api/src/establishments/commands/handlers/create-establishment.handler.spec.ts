import { asEstablishmentId, asUserId, DEFAULT_ESTABLISHMENT_MODULES } from '@coaster/common';
import { DbRole } from '@coaster/core/db';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentWriteRepository } from '../../data-access/establishment.write.repository';
import { EstablishmentCreatedEvent } from '../../events';
import { CreateEstablishmentCommand } from '../impl/create-establishment.command';
import { CreateEstablishmentHandler } from './create-establishment.handler';

describe('CreateEstablishmentHandler', () => {
  let handler: CreateEstablishmentHandler;
  const repository = {
    create: vi.fn(),
  };
  const eventBus = { publish: vi.fn() };

  beforeEach(async () => {
    repository.create.mockResolvedValue({ id: 'establishment-new', name: 'New Establishment' });
    eventBus.publish.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEstablishmentHandler,
        { provide: EstablishmentWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateEstablishmentHandler>(CreateEstablishmentHandler);
  });

  it('should create an establishment', async () => {
    const user = {
      id: asUserId('user-1'),
      name: 'User 1',
      email: 'a@a.com',
      active: true,
      role: DbRole.USER,
      language: 'es',
    };
    const dto = { name: 'New Establishment' };
    repository.create.mockResolvedValue({
      id: 'establishment-new',
      name: 'New Establishment',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new CreateEstablishmentCommand(dto, user));

    expect(repository.create).toHaveBeenCalledWith(user.id, dto, DEFAULT_ESTABLISHMENT_MODULES, 'es');
    expect(result).toBeUndefined();
  });

  it('should take the language from whoever creates it', async () => {
    const user = {
      id: asUserId('user-2'),
      name: 'User 2',
      email: 'b@b.com',
      active: true,
      role: DbRole.USER,
      language: 'en',
    };

    await handler.execute(new CreateEstablishmentCommand({ name: 'Second' }, user));

    expect(repository.create).toHaveBeenCalledWith(user.id, { name: 'Second' }, DEFAULT_ESTABLISHMENT_MODULES, 'en');
  });

  it('should fall back to Spanish when the user carries a language the app does not have', async () => {
    const user = {
      id: asUserId('user-3'),
      name: 'User 3',
      email: 'c@c.com',
      active: true,
      role: DbRole.USER,
      language: 'de',
    };

    await handler.execute(new CreateEstablishmentCommand({ name: 'Third' }, user));

    expect(repository.create).toHaveBeenCalledWith(user.id, { name: 'Third' }, DEFAULT_ESTABLISHMENT_MODULES, 'es');
  });

  it('should announce the new establishment so it can be mirrored elsewhere', async () => {
    const user = {
      id: asUserId('user-4'),
      name: 'User 4',
      email: 'd@d.com',
      active: true,
      role: DbRole.USER,
      language: 'es',
    };

    await handler.execute(new CreateEstablishmentCommand({ name: 'Fourth' }, user));

    expect(eventBus.publish).toHaveBeenCalledWith(
      new EstablishmentCreatedEvent(asEstablishmentId('establishment-new'), user.id),
    );
  });
});
