import { Test, TestingModule } from '@nestjs/testing';
import { BarMembersRepository } from './bar-members.repository';

describe('BarMembersRepository', () => {
  let service: BarMembersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BarMembersRepository],
    }).compile();

    service = module.get<BarMembersRepository>(BarMembersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
