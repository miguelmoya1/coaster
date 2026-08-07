import { AdminAuditAction, BarRole, ErrorCodes } from '@coaster/common';
import { asBarId, asUserId } from '@coaster/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateBarMemberRoleCommand } from '../impl/update-bar-member-role.command';
import { UpdateBarMemberRoleHandler } from './update-bar-member-role.handler';

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: 'ADMIN',
  language: 'es',
} as any;

describe('UpdateBarMemberRoleHandler', () => {
  let handler: UpdateBarMemberRoleHandler;
  let readRepo: {
    findBarById: ReturnType<typeof vi.fn>;
    findMembership: ReturnType<typeof vi.fn>;
    countOwners: ReturnType<typeof vi.fn>;
  };
  let writeRepo: { updateBarMemberRole: ReturnType<typeof vi.fn> };
  let auditRepo: { record: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepo = {
      findBarById: vi.fn().mockResolvedValue({ id: 'bar-1', name: 'El Bar' }),
      findMembership: vi.fn().mockResolvedValue({
        id: 'member-1',
        role: BarRole.STAFF,
        user: { name: 'Staff', email: 'staff@bar.com' },
      }),
      countOwners: vi.fn().mockResolvedValue(2),
    };
    writeRepo = { updateBarMemberRole: vi.fn().mockResolvedValue(undefined) };
    auditRepo = { record: vi.fn().mockResolvedValue(undefined) };

    handler = new UpdateBarMemberRoleHandler(readRepo as any, writeRepo as any, auditRepo as any);
  });

  it('should change the role and record who moved whom', async () => {
    await handler.execute(
      new UpdateBarMemberRoleCommand(asBarId('bar-1'), asUserId('user-2'), BarRole.MANAGER, actor),
    );

    expect(writeRepo.updateBarMemberRole).toHaveBeenCalledWith('bar-1', 'user-2', BarRole.MANAGER);
    expect(auditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.BAR_MEMBER_ROLE_CHANGED,
        metadata: expect.objectContaining({ from: BarRole.STAFF, to: BarRole.MANAGER }),
      }),
    );
  });

  it('should refuse to demote the only owner the bar has', async () => {
    readRepo.findMembership.mockResolvedValue({
      id: 'member-1',
      role: BarRole.OWNER,
      user: { name: 'Owner', email: 'owner@bar.com' },
    });
    readRepo.countOwners.mockResolvedValue(1);

    await expect(
      handler.execute(new UpdateBarMemberRoleCommand(asBarId('bar-1'), asUserId('user-2'), BarRole.STAFF, actor)),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER));

    expect(writeRepo.updateBarMemberRole).not.toHaveBeenCalled();
  });

  it('should do nothing when the member already holds that role', async () => {
    await handler.execute(new UpdateBarMemberRoleCommand(asBarId('bar-1'), asUserId('user-2'), BarRole.STAFF, actor));

    expect(writeRepo.updateBarMemberRole).not.toHaveBeenCalled();
    expect(auditRepo.record).not.toHaveBeenCalled();
  });

  it('should reject somebody who is not a member of the bar', async () => {
    readRepo.findMembership.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdateBarMemberRoleCommand(asBarId('bar-1'), asUserId('nobody'), BarRole.STAFF, actor)),
    ).rejects.toThrow(NotFoundException);
  });
});
