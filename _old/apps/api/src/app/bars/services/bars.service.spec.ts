import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { BarRepository } from '../data-access/bar.repository';
import { BarsService } from './bars.service';

describe('BarsService', () => {
  let service: BarsService;
  let repository: Mocked<BarRepository>;

  const FAKE_DATE = new Date('2026-01-01T10:00:00Z');

  beforeEach(async () => {
    const mockRepo = {
      create: vi.fn(),
      findByUserId: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarsService, { provide: BarRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<BarsService>(BarsService);
    repository = module.get(BarRepository);
  });

  describe('create', () => {
    it('should map the created bar correctly', async () => {
      repository.create.mockResolvedValue({
        id: 'bar-123',
        name: 'Nuevo Bar',
        createdAt: FAKE_DATE,
        updatedAt: FAKE_DATE,
      });

      const result = await service.create(
        {
          name: 'Nuevo Bar',
        },
        { id: 'user-id' },
      );

      expect(repository.create).toHaveBeenCalledWith('user-id', { name: 'Nuevo Bar' });
      expect(result).toEqual({
        id: 'bar-123',
        name: 'Nuevo Bar',
        createdAt: FAKE_DATE.toISOString(),
        updatedAt: FAKE_DATE.toISOString(),
      });
    });
  });

  describe('getForUser', () => {
    it('should map the user bar list correctly', async () => {
      repository.findByUserId.mockResolvedValue([
        {
          id: 'bar-1',
          name: 'Bar Paco',
          createdAt: FAKE_DATE,
          updatedAt: FAKE_DATE,
        },
      ]);

      const result = await service.getForUser({ id: 'user-id' });

      expect(repository.findByUserId).toHaveBeenCalledWith('user-id');
      expect(result).toEqual([
        {
          id: 'bar-1',
          name: 'Bar Paco',
          createdAt: FAKE_DATE.toISOString(),
          updatedAt: FAKE_DATE.toISOString(),
        },
      ]);
    });

    it('should return an empty array if no bars', async () => {
      repository.findByUserId.mockResolvedValue([]);

      const result = await service.getForUser({ id: 'user-id' });

      expect(result).toEqual([]);
    });
  });
});
