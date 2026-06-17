import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { StatsWriteRepository } from './stats.write.repository';

describe('StatsWriteRepository', () => {
  let repository: StatsWriteRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsWriteRepository],
    }).compile();

    repository = module.get<StatsWriteRepository>(StatsWriteRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
