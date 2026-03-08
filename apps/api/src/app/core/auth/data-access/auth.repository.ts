import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly _prisma: PrismaService) {}

  public async findUserForAuthentication(email: string) {
    return this._prisma.user.findUnique({ where: { email } });
  }
}
