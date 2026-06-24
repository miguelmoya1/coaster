import { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class UserReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findById(id: UserId) {
    return this._db.dbUser.findUnique({ where: { id } });
  }

  public async findByEmail(email: string) {
    return this._db.dbUser.findUnique({ where: { email } });
  }
}
