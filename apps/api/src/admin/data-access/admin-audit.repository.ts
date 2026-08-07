import type { AdminAuditAction, AdminAuditQuery, AdminAuditTargetType, UserId } from '@coaster/common';
import type { DbAdminAuditLogUncheckedCreateInput, DbAdminAuditLogWhereInput } from '@coaster/core/db';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

type AuditMetadata = DbAdminAuditLogUncheckedCreateInput['metadata'];

const auditSelect = {
  id: true,
  action: true,
  targetType: true,
  targetId: true,
  targetLabel: true,
  reason: true,
  metadata: true,
  createdAt: true,
  actor: { select: { id: true, name: true, email: true } },
} as const;

export interface RecordAuditEntry {
  actorId: UserId;
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId: string;
  targetLabel?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AdminAuditRepository {
  constructor(private readonly _db: DbService) {}

  public record(entry: RecordAuditEntry) {
    return this._db.dbAdminAuditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetLabel: entry.targetLabel ?? null,
        reason: entry.reason ?? null,
        metadata: (entry.metadata ?? undefined) as AuditMetadata,
      },
    });
  }

  public async list(query: AdminAuditQuery, page: number, pageSize: number) {
    const where: DbAdminAuditLogWhereInput = {};

    if (query.targetType) {
      where.targetType = query.targetType;
    }

    if (query.targetId) {
      where.targetId = query.targetId;
    }

    if (query.action) {
      where.action = query.action;
    }

    const [items, total] = await this._db.$transaction([
      this._db.dbAdminAuditLog.findMany({
        where,
        select: auditSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this._db.dbAdminAuditLog.count({ where }),
    ]);

    return { items, total };
  }

  public findRecentForTarget(targetType: AdminAuditTargetType, targetId: string, take: number) {
    return this._db.dbAdminAuditLog.findMany({
      where: { targetType, targetId },
      select: auditSelect,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
