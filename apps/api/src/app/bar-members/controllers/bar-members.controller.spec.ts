import { Test, TestingModule } from '@nestjs/testing';
import { BarMembersController } from './bar-members.controller';

describe('BarMembersController', () => {
  let controller: BarMembersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarMembersController],
    }).compile();

    controller = module.get<BarMembersController>(BarMembersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
