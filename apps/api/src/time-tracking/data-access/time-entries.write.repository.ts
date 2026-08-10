import { randomUUID } from 'node:crypto';
import type {
  EstablishmentId,
  ShiftId,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
  UserId,
} from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { GENESIS_HASH, hashEntry } from '../domain/time-entry-chain';

export interface AppendTimeEntryInput {
  establishmentId: EstablishmentId;
  userId: UserId;
  userSnapshot: { name: string; email: string };
  type: TimeEntryType;
  action: TimeEntryAction;
  occurredAt: Date;
  workdayDate: Date;
  source: TimeEntrySource;
  actorId: UserId;
  rootId?: string;
  supersedesId?: string;
  reason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  shiftId?: ShiftId | null;
}

const entrySelect = {
  user: { select: { id: true, name: true } },
  actor: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TimeEntriesWriteRepository {
  constructor(private readonly _db: DbService) {}

  public append(input: AppendTimeEntryInput) {
    return this._db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.establishmentId}))`;

      const head = await tx.dbTimeEntry.findFirst({
        where: { establishmentId: input.establishmentId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true, hash: true },
      });

      const id = randomUUID();
      const payload = {
        id,
        establishmentId: input.establishmentId,
        userId: input.userId,
        rootId: input.rootId ?? id,
        type: input.type,
        action: input.action,
        occurredAt: input.occurredAt,
        recordedAt: new Date(),
        workdayDate: input.workdayDate,
        userSnapshot: input.userSnapshot,
        source: input.source,
        supersedesId: input.supersedesId ?? null,
        actorId: input.actorId,
        reason: input.reason ?? null,
        sequence: (head?.sequence ?? 0n) + 1n,
      };
      const prevHash = head?.hash ?? GENESIS_HASH;

      return tx.dbTimeEntry.create({
        data: {
          ...payload,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          shiftId: input.shiftId ?? null,
          prevHash,
          hash: hashEntry(payload, prevHash),
        },
        include: entrySelect,
      });
    });
  }
}
