import { UserId } from '@coaster/common';
import { DbService, DbUserUncheckedCreateInput, DbUserUncheckedUpdateInput } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

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

  public async update(id: UserId, updateUserDto: UpdateUserDto, language?: string) {
    return this.db.dbUser.update({
      where: { id },
      data: {
        ...updateUserDto,
        ...(language && { preferences: { upsert: { create: { language }, update: { language } } } }),
      },
      include: { preferences: true },
    });
  }

  public async upsert(email: string, data: CreateUserDto, language?: string) {
    return this.db.dbUser.upsert({
      where: { email },
      update: {
        googleId: data.googleId,
        name: data.name,
        photoUrl: data.photoUrl,
        active: data.active,
        ...(language && { preferences: { upsert: { create: { language }, update: { language } } } }),
      },
      create: { ...data, preferences: { create: language ? { language } : {} } },
      include: { preferences: true },
    });
  }
}
