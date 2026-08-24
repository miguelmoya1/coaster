import { AdminAuditAction, AdminAuditTargetType, ErrorCodes, asUserId } from '@coaster/common';
import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AddBetaTesterCommand } from '../impl/add-beta-tester.command';
import { AddBetaTesterHandler } from './add-beta-tester.handler';

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: 'ADMIN',
  language: 'es',
} as any;

describe('AddBetaTesterHandler', () => {
  let handler: AddBetaTesterHandler;
  let repo: { findByEmail: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  const published = <T>(type: new (...args: never[]) => T): T | undefined =>
    eventBus.publish.mock.calls.map(([event]) => event).find((event) => event instanceof type);

  beforeEach(() => {
    repo = {
      findByEmail: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue({ id: 'beta-1', email: 'tester@bar.com', note: 'Bar Pepe' }),
    };
    eventBus = { publish: vi.fn() };

    handler = new AddBetaTesterHandler(repo as any, eventBus as any);
  });

  it('should store the address folded to lower case and trimmed', async () => {
    await handler.execute(new AddBetaTesterCommand({ email: '  Tester@Bar.com ', note: '  Bar Pepe  ' }, actor));

    expect(repo.findByEmail).toHaveBeenCalledWith('tester@bar.com');
    expect(repo.add).toHaveBeenCalledWith('tester@bar.com', 'Bar Pepe', actor.id);
  });

  it('should record who opened the door and for whom', async () => {
    await handler.execute(new AddBetaTesterCommand({ email: 'tester@bar.com' }, actor));

    expect(published(AdminActionEvent)?.entry).toMatchObject({
      actorId: actor.id,
      action: AdminAuditAction.BETA_TESTER_ADDED,
      targetType: AdminAuditTargetType.BETA_TESTER,
      targetId: 'beta-1',
      targetLabel: 'tester@bar.com',
    });
  });

  it('should refuse to add an address already on the list', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'beta-1', email: 'tester@bar.com' });

    await expect(handler.execute(new AddBetaTesterCommand({ email: 'tester@bar.com' }, actor))).rejects.toThrow(
      new ConflictException(ErrorCodes.BETA_TESTER_ALREADY_EXISTS),
    );

    expect(repo.add).not.toHaveBeenCalled();
  });

  it('should keep an empty note as no note at all', async () => {
    await handler.execute(new AddBetaTesterCommand({ email: 'tester@bar.com', note: '   ' }, actor));

    expect(repo.add).toHaveBeenCalledWith('tester@bar.com', null, actor.id);
  });
});
