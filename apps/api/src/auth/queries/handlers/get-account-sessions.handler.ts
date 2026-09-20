import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AuthSessionRepository } from '../../data-access/auth-session.repository';
import { GetAccountSessionsQuery } from '../impl/get-account-sessions.query';

export interface AccountSession {
  id: string;
  current: boolean;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

interface LiveSession {
  id: string;
  familyId: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  rotatedAt: Date | null;
}

const oldest = (dates: Date[]): Date => dates.reduce((earliest, date) => (date < earliest ? date : earliest));

const newest = (dates: Date[]): Date => dates.reduce((latest, date) => (date > latest ? date : latest));

@QueryHandler(GetAccountSessionsQuery)
export class GetAccountSessionsHandler implements IQueryHandler<GetAccountSessionsQuery, AccountSession[]> {
  constructor(private readonly _sessions: AuthSessionRepository) {}

  async execute(query: GetAccountSessionsQuery): Promise<AccountSession[]> {
    const live = await this._sessions.findLiveOf(query.userId);

    return this.#byFamily(live)
      .map((family) => this.#summarise(family, query.currentSessionId))
      .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());
  }

  #byFamily(sessions: LiveSession[]): LiveSession[][] {
    const families = new Map<string, LiveSession[]>();

    for (const session of sessions) {
      const family = families.get(session.familyId);

      if (family) {
        family.push(session);
      } else {
        families.set(session.familyId, [session]);
      }
    }

    return [...families.values()];
  }

  #summarise(family: LiveSession[], currentSessionId: string | null): AccountSession {
    const head = family.find((session) => session.rotatedAt === null) ?? family[0];
    const known = family.find((session) => session.userAgent !== null || session.ip !== null);

    return {
      id: head.id,
      current: currentSessionId !== null && family.some((session) => session.id === currentSessionId),
      userAgent: head.userAgent ?? known?.userAgent ?? null,
      ip: head.ip ?? known?.ip ?? null,
      createdAt: oldest(family.map((session) => session.createdAt)),
      lastUsedAt: newest(family.map((session) => session.lastUsedAt)),
      expiresAt: head.expiresAt,
    };
  }
}
