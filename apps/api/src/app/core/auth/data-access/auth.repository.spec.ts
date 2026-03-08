import { Test, TestingModule } from '@nestjs/testing';
import { AuthRepository } from './auth.repository';

describe('AuthRepository', () => {
  let repository: AuthRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthRepository],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
