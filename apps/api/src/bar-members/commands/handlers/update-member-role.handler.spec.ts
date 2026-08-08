import { BarRole, ErrorCodes, Role, asBarId, asBarMemberId, asUserId } from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberRoleChangedEvent } from '../../events';
import { UpdateMemberRoleCommand } from '../impl/update-member-role.command';
import { UpdateMemberRoleHandler } from './update-member-role.handler';

const owner = { id: 'member-owner', userId: 'user-owner', role: BarRole.OWNER };

const actor = { id: asUserId('user-owner'), role: Role.USER } as any;
const staff = { id: 'member-staff', userId: 'user-staff', role: BarRole.STAFF };

describe('UpdateMemberRoleHandler', () => {
  let handler: UpdateMemberRoleHandler;
  let readRepo: { getMembersByBar: ReturnType<typeof vi.fn> };
  let writeRepo: { updateRole: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    readRepo = { getMembersByBar: vi.fn().mockResolvedValue([owner, staff]) };
    writeRepo = { updateRole: vi.fn().mockResolvedValue(true) };
    eventBus = { publish: vi.fn() };

    handler = new UpdateMemberRoleHandler(readRepo as any, writeRepo as any, eventBus as any);
  });

  const run = (memberId: string, role: BarRole, by = actor) =>
    handler.execute(new UpdateMemberRoleCommand(asBarId('bar-1'), asBarMemberId(memberId), role, by));

  it('should promote a staff member to manager and announce it', async () => {
    await run(staff.id, BarRole.MANAGER);

    expect(writeRepo.updateRole).toHaveBeenCalledWith('bar-1', staff.id, BarRole.MANAGER);
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(MemberRoleChangedEvent));
    expect(eventBus.publish.mock.calls[0][0]).toMatchObject({
      barId: 'bar-1',
      memberId: staff.id,
      userId: staff.userId,
      from: BarRole.STAFF,
      to: BarRole.MANAGER,
      actorId: 'user-owner',
      actorRole: Role.USER,
    });
  });

  it('should carry a platform admin actor through, which is what the audit log keys on', async () => {
    const admin = { id: asUserId('admin-1'), role: Role.ADMIN } as any;

    await run(staff.id, BarRole.MANAGER, admin);

    expect(eventBus.publish.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      actorRole: Role.ADMIN,
    });
  });

  it('should let an owner step down while another owner remains', async () => {
    readRepo.getMembersByBar.mockResolvedValue([owner, { ...staff, role: BarRole.OWNER }]);

    await run(owner.id, BarRole.STAFF);

    expect(writeRepo.updateRole).toHaveBeenCalledWith('bar-1', owner.id, BarRole.STAFF);
  });

  it('should refuse to demote the only owner the bar has', async () => {
    await expect(run(owner.id, BarRole.MANAGER)).rejects.toThrow(
      new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER),
    );

    expect(writeRepo.updateRole).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should do nothing when the member already holds that role', async () => {
    await run(staff.id, BarRole.STAFF);

    expect(writeRepo.updateRole).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should reject a member that does not belong to the bar', async () => {
    await expect(run('member-ghost', BarRole.STAFF)).rejects.toThrow(NotFoundException);
  });

  it('should reject when the write matched no row', async () => {
    writeRepo.updateRole.mockResolvedValue(false);

    await expect(run(staff.id, BarRole.MANAGER)).rejects.toThrow(NotFoundException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
