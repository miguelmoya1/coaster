import { AdminAuditAction, AdminAuditTargetType, asUserId } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminActionEvent } from '../impl/admin-action.event';
import { RecordAdminActionHandler } from './record-admin-action.handler';

const entry = {
  actorId: asUserId('admin-1'),
  action: AdminAuditAction.BAR_PLAN_GRANTED,
  targetType: AdminAuditTargetType.BAR,
  targetId: 'bar-1',
  targetLabel: 'El Bar',
};

describe('RecordAdminActionHandler', () => {
  let handler: RecordAdminActionHandler;
  let auditRepo: { record: ReturnType<typeof vi.fn> };
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorLog = vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);
    auditRepo = { record: vi.fn().mockResolvedValue(undefined) };
    handler = new RecordAdminActionHandler(auditRepo as any);
  });

  it('should write whatever entry the event carries', async () => {
    await handler.handle(new AdminActionEvent(entry));

    expect(auditRepo.record).toHaveBeenCalledWith(entry);
  });

  it('should swallow a write failure but leave a loud trace', async () => {
    auditRepo.record.mockRejectedValue(new Error('db down'));

    await expect(handler.handle(new AdminActionEvent(entry))).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalled();
  });
});
