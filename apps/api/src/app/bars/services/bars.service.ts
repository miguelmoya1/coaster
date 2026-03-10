import { asBarId, Bar, CreateBarDto, UserId } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { Bar as BarDb } from '../../core';
import { BarRepository } from '../data-access/bar.repository';

@Injectable()
export class BarsService {
  constructor(private readonly barRepository: BarRepository) {}

  async create(userId: UserId, dto: CreateBarDto) {
    const bar = await this.barRepository.create(dto.name, userId);

    return this.#mapToDomain(bar);
  }

  async getForUser(userId: UserId) {
    const memberships = await this.barRepository.findByUserId(userId);

    return memberships.map((m) => this.#mapToDomain(m));
  }

  #mapToDomain(dbBar: BarDb): Bar {
    return {
      id: asBarId(dbBar.id),
      name: dbBar.name,
      createdAt: dbBar.createdAt.toISOString(),
      updatedAt: dbBar.updatedAt.toISOString(),
    };
  }
}
