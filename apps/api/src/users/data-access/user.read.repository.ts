import { UserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findById(id: UserId) {
    return this._db.dbUser.findUnique({ where: { id }, include: { preferences: true } });
  }

  public async findByEmail(email: string) {
    return this._db.dbUser.findUnique({ where: { email }, include: { preferences: true } });
  }
}
