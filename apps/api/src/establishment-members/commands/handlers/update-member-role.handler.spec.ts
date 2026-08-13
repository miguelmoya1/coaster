import {
  EstablishmentRole,
  ErrorCodes,
  Role,
  asEstablishmentId,
  asEstablishmentMemberId,
  asUserId,
} from '@coaster/common';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberRoleChangedEvent } from '../../events';
import { UpdateMemberRoleCommand } from '../impl/update-member-role.command';
import { UpdateMemberRoleHandler } from './update-member-role.handler';

const owner = { id: 'member-owner', userId: 'user-owner', role: EstablishmentRole.OWNER };

const actor = { id: asUserId('user-owner'), role: Role.USER } as any;
const staff = { id: 'member-staff', userId: 'user-staff', role: EstablishmentRole.STAFF };

describe('UpdateMemberRoleHandler', () => {
  let handler: UpdateMemberRoleHandler;
  let readRepo: { getMembersByEstablishment: ReturnType<typeof vi.fn> };
  let writeRepo: { updateRole: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);

    readRepo = { getMembersByEstablishment: vi.fn().mockResolvedValue([owner, staff]) };
    writeRepo = { updateRole: vi.fn().mockResolvedValue(true) };
    eventBus = { publish: vi.fn() };

    handler = new UpdateMemberRoleHandler(readRepo as any, writeRepo as any, eventBus as any);
  });

  const run = (memberId: string, role: EstablishmentRole, by = actor) =>
    handler.execute(
      new UpdateMemberRoleCommand(asEstablishmentId('establishment-1'), asEstablishmentMemberId(memberId), role, by),
    );

  it('should promote a staff member to manager and announce it', async () => {
    await run(staff.id, EstablishmentRole.MANAGER);

    expect(writeRepo.updateRole).toHaveBeenCalledWith('establishment-1', staff.id, EstablishmentRole.MANAGER);
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(MemberRoleChangedEvent));
    expect(eventBus.publish.mock.calls[0][0]).toMatchObject({
      establishmentId: 'establishment-1',
      memberId: staff.id,
      userId: staff.userId,
      from: EstablishmentRole.STAFF,
      to: EstablishmentRole.MANAGER,
      actorId: 'user-owner',
      actorRole: Role.USER,
    });
  });

  it('should carry a platform admin actor through, which is what the audit log keys on', async () => {
    const admin = { id: asUserId('admin-1'), role: Role.ADMIN } as any;

    await run(staff.id, EstablishmentRole.MANAGER, admin);

    expect(eventBus.publish.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      actorRole: Role.ADMIN,
    });
  });

  it('should let an owner step down while another owner remains', async () => {
    readRepo.getMembersByEstablishment.mockResolvedValue([owner, { ...staff, role: EstablishmentRole.OWNER }]);

    await run(owner.id, EstablishmentRole.STAFF);

    expect(writeRepo.updateRole).toHaveBeenCalledWith('establishment-1', owner.id, EstablishmentRole.STAFF);
  });

  it('should refuse to demote the only owner the establishment has', async () => {
    await expect(run(owner.id, EstablishmentRole.MANAGER)).rejects.toThrow(
      new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER),
    );

    expect(writeRepo.updateRole).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should do nothing when the member already holds that role', async () => {
    await run(staff.id, EstablishmentRole.STAFF);

    expect(writeRepo.updateRole).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should reject a member that does not belong to the establishment', async () => {
    await expect(run('member-ghost', EstablishmentRole.STAFF)).rejects.toThrow(NotFoundException);
  });

  it('should reject when the write matched no row', async () => {
    writeRepo.updateRole.mockResolvedValue(false);

    await expect(run(staff.id, EstablishmentRole.MANAGER)).rejects.toThrow(NotFoundException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
