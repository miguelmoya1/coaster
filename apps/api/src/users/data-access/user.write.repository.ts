import { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService, DbUserUncheckedCreateInput, DbUserUncheckedUpdateInput } from '../../core/db';

type CreateUserDto = Omit<
  DbUserUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'memberships' | 'shifts' | 'shiftRequests' | 'shiftApprovals'
>;
type UpdateUserDto = Omit<
  DbUserUncheckedUpdateInput,
  'id' | 'createdAt' | 'updatedAt' | 'memberships' | 'shifts' | 'shiftRequests' | 'shiftApprovals'
>;

@Injectable()
export class UserWriteRepository {
  constructor(private readonly db: DbService) {}

  public async update(id: UserId, updateUserDto: UpdateUserDto) {
    return this.db.dbUser.update({
      where: { id },
      data: { ...updateUserDto },
    });
  }

  public async upsert(email: string, data: CreateUserDto) {
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
