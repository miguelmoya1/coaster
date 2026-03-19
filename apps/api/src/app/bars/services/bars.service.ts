import { asBarId, Bar, BarId, CreateBarDto, User } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { Bar as BarDb } from '../../core';
import { BarRepository } from '../data-access/bar.repository';

@Injectable()
export class BarsService {
  constructor(private readonly barRepository: BarRepository) {}

  async create(dto: CreateBarDto, user: User) {
    const bar = await this.barRepository.create(user.id, dto);

    return this.#mapToDomain(bar);
  }

  async getForUser(user: User) {
    const memberships = await this.barRepository.findByUserId(user.id);

    return memberships.map((m) => this.#mapToDomain(m));
  }

  async get(barId: BarId) {
    const bar = await this.barRepository.findById(barId);

    if (!bar) {
      return null;
    }

    return this.#mapToDomain(bar);
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
