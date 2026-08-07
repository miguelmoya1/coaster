import { AdminAuditAction, ErrorCodes, Role, asUserId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateAdminUserCommand } from '../impl/update-admin-user.command';
import { UpdateAdminUserHandler } from './update-admin-user.handler';

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: Role.ADMIN,
  language: 'es',
} as any;

const target = {
  id: 'user-2',
  name: 'Staff',
  email: 'staff@bar.com',
  role: Role.USER,
  active: true,
};

describe('UpdateAdminUserHandler', () => {
  let handler: UpdateAdminUserHandler;
  let readRepo: { findUserById: ReturnType<typeof vi.fn>; countAdmins: ReturnType<typeof vi.fn> };
  let writeRepo: { updateUser: ReturnType<typeof vi.fn> };
  let auditRepo: { record: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepo = {
      findUserById: vi.fn().mockResolvedValue(target),
      countAdmins: vi.fn().mockResolvedValue(3),
    };
    writeRepo = { updateUser: vi.fn().mockResolvedValue(undefined) };
    auditRepo = { record: vi.fn().mockResolvedValue(undefined) };

    handler = new UpdateAdminUserHandler(readRepo as any, writeRepo as any, auditRepo as any);
  });

  it('should promote a user and record the role change', async () => {
    await handler.execute(new UpdateAdminUserCommand(asUserId('user-2'), { role: Role.ADMIN }, actor));

    expect(writeRepo.updateUser).toHaveBeenCalledWith('user-2', { role: Role.ADMIN, active: undefined });
    expect(auditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.USER_ROLE_CHANGED,
        metadata: { from: Role.USER, to: Role.ADMIN },
      }),
    );
  });

  it('should record an activation change on its own entry', async () => {
    await handler.execute(new UpdateAdminUserCommand(asUserId('user-2'), { active: false }, actor));

    expect(auditRepo.record).toHaveBeenCalledTimes(1);
    expect(auditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.USER_ACTIVATION_CHANGED,
        metadata: { active: false },
      }),
    );
  });

  it('should refuse to let an admin change their own account', async () => {
    await expect(
      handler.execute(new UpdateAdminUserCommand(asUserId('admin-1'), { role: Role.USER }, actor)),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.CANNOT_EDIT_OWN_ADMIN_ACCOUNT));

    expect(readRepo.findUserById).not.toHaveBeenCalled();
  });

  it('should refuse to demote the last remaining admin', async () => {
    readRepo.findUserById.mockResolvedValue({ ...target, role: Role.ADMIN });
    readRepo.countAdmins.mockResolvedValue(1);

    await expect(
      handler.execute(new UpdateAdminUserCommand(asUserId('user-2'), { role: Role.USER }, actor)),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.CANNOT_DEMOTE_LAST_ADMIN));

    expect(writeRepo.updateUser).not.toHaveBeenCalled();
  });

  it('should refuse to deactivate the last remaining admin', async () => {
    readRepo.findUserById.mockResolvedValue({ ...target, role: Role.ADMIN });
    readRepo.countAdmins.mockResolvedValue(1);

    await expect(
      handler.execute(new UpdateAdminUserCommand(asUserId('user-2'), { active: false }, actor)),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.CANNOT_DEMOTE_LAST_ADMIN));
  });

  it('should do nothing when the request asks for the state the user is already in', async () => {
    await handler.execute(new UpdateAdminUserCommand(asUserId('user-2'), { role: Role.USER, active: true }, actor));

    expect(writeRepo.updateUser).not.toHaveBeenCalled();
    expect(auditRepo.record).not.toHaveBeenCalled();
  });

  it('should reject a user that does not exist', async () => {
    readRepo.findUserById.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdateAdminUserCommand(asUserId('missing'), { active: false }, actor)),
    ).rejects.toThrow(NotFoundException);
  });
});
