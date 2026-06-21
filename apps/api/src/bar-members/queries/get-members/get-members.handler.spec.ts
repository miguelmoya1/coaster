import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asBarRole, getRolePermissions } from '../../../core';
import { DbBarRole } from '../../../core/db';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { GetMembersHandler } from './get-members.handler';
import { GetMembersQuery } from './get-members.query';

describe('GetMembersHandler', () => {
  let handler: GetMembersHandler;
  const repository = {
    getMembersByBar: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetMembersHandler, { provide: BarMembersReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetMembersHandler>(GetMembersHandler);
  });

  it('should return the bar members', async () => {
    repository.getMembersByBar.mockResolvedValue([
      {
        id: 'member-1',
        userId: 'user-1',
        barId: 'bar-1',
        active: true,
        role: DbBarRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          name: 'admin',
          photoUrl: 'http://user-1.jpg',
          email: 'admin@mail.com',
        },
      },
    ]);

    const result = await handler.execute(new GetMembersQuery(asBarId('bar-1')));

    expect(repository.getMembersByBar).toHaveBeenCalledWith('bar-1');
    expect(result).toEqual([
      {
        id: 'member-1',
        userId: 'user-1',
        barId: 'bar-1',
        active: true,
        role: DbBarRole.OWNER,
        permissions: getRolePermissions(asBarRole(DbBarRole.OWNER)),
        userName: 'admin',
        userImage: 'http://user-1.jpg',
        userEmail: 'admin@mail.com',
      },
    ]);
  });
});
