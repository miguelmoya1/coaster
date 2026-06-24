import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteAiHandler } from './execute-ai.handler';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SecurityRepository } from '../../../core';
import { DbRole } from '../../../core/db';
import { beforeEach, describe, expect, it, vi, Mocked } from 'vitest';
import { generateText } from 'ai';
import { ForbiddenException } from '@nestjs/common';
import type { User } from '@coaster/common';
import { asBarId, asUserId } from '../../../core';
import { ExecuteAiCommand } from '../impl/execute-ai.command';

// Mock Vercel AI SDK
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

describe('ExecuteAiHandler', () => {
  let handler: ExecuteAiHandler;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;
  let securityRepository: Mocked<SecurityRepository>;

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };
    const mockSecurityRepository = {
      getUserRole: vi.fn(),
      getBarMemberRole: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteAiHandler,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
        { provide: SecurityRepository, useValue: mockSecurityRepository },
      ],
    }).compile();

    handler = module.get<ExecuteAiHandler>(ExecuteAiHandler);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
    securityRepository = module.get(SecurityRepository);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const barId = asBarId('bar-1');
    const user = { id: asUserId('user-1'), name: 'Juan Carlos', language: 'es' } as User;
    const prompt = 'Crea la mesa 3';
    const command = new ExecuteAiCommand(barId, prompt, user);

    it('should throw ForbiddenException if user is not a member of the bar and not an admin', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepository.getBarMemberRole.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should execute successfully for an admin', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]); // Mock all queries returning empty arrays
      (generateText as any).mockResolvedValue({ text: 'Mesa creada correctamente.' });

      const result = await handler.execute(command);

      expect(securityRepository.getUserRole).toHaveBeenCalledWith(user.id);
      expect(queryBus.execute).toHaveBeenCalledTimes(3); // tables, products, open orders
      expect(generateText).toHaveBeenCalled();
      expect(result).toEqual({ text: 'Mesa creada correctamente.' });
    });

    it('should execute successfully for an active staff member', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepository.getBarMemberRole.mockResolvedValue({ role: 'STAFF', active: true });
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'Mesa creada correctamente.' });

      const result = await handler.execute(command);

      expect(securityRepository.getBarMemberRole).toHaveBeenCalledWith(user.id, barId);
      expect(generateText).toHaveBeenCalled();
      expect(result).toEqual({ text: 'Mesa creada correctamente.' });
    });
  });
});
