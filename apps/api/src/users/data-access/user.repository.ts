import { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbUserUncheckedCreateInput, DbUserUncheckedUpdateInput } from '../../db';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DbService) {}

  public async findById(id: UserId) {
    return this.db.dbUser.findUnique({ where: { id } });
  }

  public async findByEmail(email: string) {
    return this.db.dbUser.findUnique({ where: { email } });
  }

  public async update(id: UserId, updateUserDto: DbUserUncheckedUpdateInput) {
    return this.db.dbUser.update({
      where: { id },
      data: { ...updateUserDto },
    });
  }

  public async upsert(email: string, data: DbUserUncheckedCreateInput) {
    return this.db.dbUser.upsert({
      where: { email },
      update: {
        googleId: data.googleId,
        name: data.name,
        photoUrl: data.photoUrl,
        active: data.active,
      },
      create: data,
    });
  }
}
