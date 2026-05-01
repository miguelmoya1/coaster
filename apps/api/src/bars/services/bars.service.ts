import { BarId, CreateBarDto, User } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { BarRepository } from '../data-access/bar.repository';
import { BarsMapper } from '../mappers/bars.mapper';

@Injectable()
export class BarsService {
  constructor(private readonly barRepository: BarRepository) {}

  async create(dto: CreateBarDto, user: User) {
    const bar = await this.barRepository.create(user.id, dto);

    return BarsMapper.toDomain(bar);
  }

  async getForUser(user: User) {
    const memberships = await this.barRepository.findByUserId(user.id);

    return memberships.map((m) => BarsMapper.toDomain(m));
  }

  async get(barId: BarId) {
    const bar = await this.barRepository.findById(barId);

    if (!bar) {
      return null;
    }

    return BarsMapper.toDomain(bar);
  }
}
