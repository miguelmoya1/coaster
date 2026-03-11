import { Test, TestingModule } from '@nestjs/testing';
import { BarMembersService } from './bar-members.service';

describe('BarMembersService', () => {
  let service: BarMembersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BarMembersService],
    }).compile();

    service = module.get<BarMembersService>(BarMembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
