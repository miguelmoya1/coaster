import { AdminAuditAction, AdminAuditTargetType, ErrorCodes, asUserId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { RemoveBetaTesterCommand } from '../impl/remove-beta-tester.command';
import { RemoveBetaTesterHandler } from './remove-beta-tester.handler';

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: 'ADMIN',
  language: 'es',
} as any;

const betaTesterId = 'beta-1' as any;

describe('RemoveBetaTesterHandler', () => {
  let handler: RemoveBetaTesterHandler;
  let repo: { findById: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  const published = <T>(type: new (...args: never[]) => T): T | undefined =>
    eventBus.publish.mock.calls.map(([event]) => event).find((event) => event instanceof type);

  beforeEach(() => {
    repo = {
      findById: vi.fn().mockResolvedValue({ id: 'beta-1', email: 'tester@bar.com' }),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    eventBus = { publish: vi.fn() };

    handler = new RemoveBetaTesterHandler(repo as any, eventBus as any);
  });

  it('should drop the address and record whose invitation was withdrawn', async () => {
    await handler.execute(new RemoveBetaTesterCommand(betaTesterId, actor));

    expect(repo.remove).toHaveBeenCalledWith(betaTesterId);
    expect(published(AdminActionEvent)?.entry).toMatchObject({
      actorId: actor.id,
      action: AdminAuditAction.BETA_TESTER_REMOVED,
      targetType: AdminAuditTargetType.BETA_TESTER,
      targetId: betaTesterId,
      targetLabel: 'tester@bar.com',
    });
  });

  it('should complain about an address that is not on the list', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(handler.execute(new RemoveBetaTesterCommand(betaTesterId, actor))).rejects.toThrow(
      new NotFoundException(ErrorCodes.BETA_TESTER_NOT_FOUND),
    );

    expect(repo.remove).not.toHaveBeenCalled();
  });
});
