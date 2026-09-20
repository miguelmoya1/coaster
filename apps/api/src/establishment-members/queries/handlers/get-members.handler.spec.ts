import { asEstablishmentId, asEstablishmentRole, getRolePermissions } from '@coaster/common';
import { DbEstablishmentRole } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { GetMembersQuery } from '../impl/get-members.query';
import { GetMembersHandler } from './get-members.handler';

describe('GetMembersHandler', () => {
  let handler: GetMembersHandler;
  const repository = {
    getMembersByEstablishment: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetMembersHandler, { provide: EstablishmentMembersReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetMembersHandler>(GetMembersHandler);
  });

  it('should return the establishment members', async () => {
    repository.getMembersByEstablishment.mockResolvedValue([
      {
        id: 'member-1',
        userId: 'user-1',
        establishmentId: 'establishment-1',
        active: true,
        role: DbEstablishmentRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          name: 'admin',
          photoUrl: 'http://user-1.jpg',
          email: 'admin@mail.com',
          passwordUpdatedAt: new Date(),
          _count: { identities: 0 },
        },
      },
    ]);

    const result = await handler.execute(new GetMembersQuery(asEstablishmentId('establishment-1')));

    expect(repository.getMembersByEstablishment).toHaveBeenCalledWith('establishment-1');
    expect(result).toEqual([
      {
        id: 'member-1',
        userId: 'user-1',
        establishmentId: 'establishment-1',
        active: true,
        role: DbEstablishmentRole.OWNER,
        permissions: getRolePermissions(asEstablishmentRole(DbEstablishmentRole.OWNER)),
        pending: false,
        userName: 'admin',
        userImage: 'http://user-1.jpg',
        userEmail: 'admin@mail.com',
      },
    ]);
  });
  it('should mark as pending whoever never finished the invitation', async () => {
    repository.getMembersByEstablishment.mockResolvedValue([
      {
        id: 'member-2',
        userId: 'user-2',
        establishmentId: 'establishment-1',
        active: true,
        role: DbEstablishmentRole.STAFF,
        user: {
          id: 'user-2',
          name: 'invited',
          photoUrl: null,
          email: 'invited@mail.com',
          passwordUpdatedAt: null,
          _count: { identities: 0 },
        },
      },
    ]);

    const [member] = await handler.execute(new GetMembersQuery(asEstablishmentId('establishment-1')));

    expect(member.pending).toBe(true);
  });

  it('should not mark as pending somebody who only ever signed in with Google', async () => {
    repository.getMembersByEstablishment.mockResolvedValue([
      {
        id: 'member-3',
        userId: 'user-3',
        establishmentId: 'establishment-1',
        active: true,
        role: DbEstablishmentRole.STAFF,
        user: {
          id: 'user-3',
          name: 'google',
          photoUrl: null,
          email: 'google@mail.com',
          passwordUpdatedAt: null,
          _count: { identities: 1 },
        },
      },
    ]);

    const [member] = await handler.execute(new GetMembersQuery(asEstablishmentId('establishment-1')));

    expect(member.pending).toBe(false);
  });
});
