import {
  asBarId,
  Bar,
  BarRole,
  CreateBarDto,
  UserId,
} from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { BarRepository } from '../data-access/bar.repository';

@Injectable()
export class BarsService {
  constructor(private readonly barRepository: BarRepository) {}

  async createBar(userId: UserId, dto: CreateBarDto): Promise<Bar> {
    const bar = await this.barRepository.createBar(dto.name);
    await this.barRepository.addMember(bar.id, userId, BarRole.OWNER);

    return {
      id: asBarId(bar.id),
      name: bar.name,
      createdAt: bar.createdAt.toISOString(),
      updatedAt: bar.updatedAt.toISOString(),
    };
  }

  async getUserBars(userId: UserId) {
    const memberships = await this.barRepository.getBarsForUser(userId);
    return memberships.map((m) => ({
      id: asBarId(m.bar.id),
      name: m.bar.name,
      role: m.role as BarRole,
    }));
  }
}
