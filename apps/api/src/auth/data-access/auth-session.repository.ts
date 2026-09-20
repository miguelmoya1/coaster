import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

export interface NewSession {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthSessionRepository {
  constructor(private readonly db: DbService) {}

  public async create(session: NewSession) {
    return this.db.dbAuthSession.create({ data: session });
  }

  public async findByTokenHash(tokenHash: string) {
    return this.db.dbAuthSession.findUnique({ where: { tokenHash } });
  }

  /** Every session of this person that still lets somebody in, newest use first. */
  public async findLiveOf(userId: string) {
    return this.db.dbAuthSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  public async findOwnedBy(id: string, userId: string) {
    return this.db.dbAuthSession.findFirst({ where: { id, userId } });
  }

  public async rotate(currentId: string, next: NewSession) {
    const [, created] = await this.db.$transaction([
      this.db.dbAuthSession.update({
        where: { id: currentId },
        data: { rotatedAt: new Date(), lastUsedAt: new Date() },
      }),
      this.db.dbAuthSession.create({ data: next }),
    ]);

    return created;
  }

  public async revoke(id: string) {
    await this.db.dbAuthSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeFamily(familyId: string) {
    await this.db.dbAuthSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeEveryOtherSessionOf(userId: string, keep: string) {
    await this.db.dbAuthSession.updateMany({
      where: { userId, revokedAt: null, id: { not: keep } },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeEveryOtherFamilyOf(userId: string, keepFamilyId: string) {
    await this.db.dbAuthSession.updateMany({
      where: { userId, revokedAt: null, familyId: { not: keepFamilyId } },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeEverySessionOf(userId: string) {
    await this.db.dbAuthSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async pruneExpiredOf(userId: string) {
    await this.db.dbAuthSession.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  }
}
