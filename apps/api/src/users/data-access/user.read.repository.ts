import { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class UserReadRepository {
  constructor(private readonly db: DbService) {}

  public async findById(id: UserId) {
    return this.db.dbUser.findUnique({ where: { id } });
  }

  public async findByEmail(email: string) {
    return this.db.dbUser.findUnique({ where: { email } });
  }
}
