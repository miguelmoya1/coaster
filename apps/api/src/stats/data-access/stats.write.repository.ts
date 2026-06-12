import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class StatsWriteRepository {
  constructor(private readonly _prisma: DbService) {}
}
