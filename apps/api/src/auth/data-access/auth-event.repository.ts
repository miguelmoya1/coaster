import type { DbAuthEventType, DbAuthEventUncheckedCreateInput } from '@coaster/core/db';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

type EventMetadata = DbAuthEventUncheckedCreateInput['metadata'];

/** A browser can say whatever it likes about itself; the log takes the first part of it. */
const USER_AGENT_MAX_LENGTH = 512;

export interface RecordAuthEvent {
  type: DbAuthEventType;
  /** Absent when nobody owns the address, which is itself worth knowing. */
  userId?: string | null;
  email?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

const eventSelect = {
  id: true,
  type: true,
  userId: true,
  email: true,
  sessionId: true,
  ip: true,
  userAgent: true,
  metadata: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthEventRepository {
  constructor(private readonly _db: DbService) {}

  public record(event: RecordAuthEvent) {
    return this._db.dbAuthEvent.create({
      data: {
        type: event.type,
        userId: event.userId ?? null,
        email: event.email?.trim().toLowerCase() || null,
        sessionId: event.sessionId ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent?.slice(0, USER_AGENT_MAX_LENGTH) ?? null,
        metadata: (event.metadata ?? undefined) as EventMetadata,
      },
      select: { id: true },
    });
  }

  public findRecentOf(userId: string, take: number) {
    return this._db.dbAuthEvent.findMany({
      where: { userId },
      select: eventSelect,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
