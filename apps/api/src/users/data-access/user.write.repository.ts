import { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbUserUncheckedCreateInput, DbUserUncheckedUpdateInput } from '../../db';

@Injectable()
export class UserWriteRepository {
  constructor(private readonly db: DbService) {}

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
