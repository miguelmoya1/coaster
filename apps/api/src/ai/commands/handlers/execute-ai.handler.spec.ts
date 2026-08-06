import type { User } from '@coaster/common';
import { BarRole } from '@coaster/common';
import { asBarId, asUserId, SecurityRepository } from '@coaster/core';
import { DbRole } from '@coaster/core/db';
import { ForbiddenException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { generateText } from 'ai';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { ExecuteAiCommand } from '../impl/execute-ai.command';
import { ExecuteAiHandler } from './execute-ai.handler';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

describe('ExecuteAiHandler', () => {
  let handler: ExecuteAiHandler;
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

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    });

    it('should execute successfully for an admin', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'Mesa creada correctamente.' });

      const result = await handler.execute(command);

      expect(securityRepository.getUserRole).toHaveBeenCalledWith(user.id);
      expect(queryBus.execute).toHaveBeenCalledTimes(4);
      expect(generateText).toHaveBeenCalled();
      expect(result).toEqual({ text: 'Mesa creada correctamente.' });
    });

    it('should execute successfully for an active staff member', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepository.getBarMemberRole.mockResolvedValue({ role: BarRole.STAFF, active: true });
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'Mesa creada correctamente.' });

      const result = await handler.execute(command);

      expect(securityRepository.getBarMemberRole).toHaveBeenCalledWith(user.id, barId);
      expect(generateText).toHaveBeenCalled();
      expect(result).toEqual({ text: 'Mesa creada correctamente.' });
    });

    it('should pass message history to generateText when messages are provided', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'Segunda respuesta' });

      const customMessages = [
        { role: 'user' as const, content: 'Hola' },
        { role: 'assistant' as const, content: 'Hola, ¿en qué puedo ayudarte?' },
        { role: 'user' as const, content: 'Crear mesa 3' },
      ];
      const cmdWithMessages = new ExecuteAiCommand(barId, 'Crear mesa 3', user, customMessages);
      const result = await handler.execute(cmdWithMessages);

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Hola' },
            { role: 'assistant', content: 'Hola, ¿en qué puedo ayudarte?' },
            { role: 'user', content: 'Crear mesa 3' },
          ],
        }),
      );
      expect(result).toEqual({ text: 'Segunda respuesta' });
    });

    it('should only send the most recent exchanges so a long shift does not grow the prompt', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'ok' });

      const longHistory = Array.from({ length: 30 }, (_, index) => ({
        role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `mensaje ${index}`,
      }));

      await handler.execute(new ExecuteAiCommand(barId, 'mensaje 29', user, longHistory));

      const sent = (generateText as any).mock.calls.at(-1)[0].messages;
      expect(sent).toHaveLength(10);
      expect(sent.at(0).content).toBe('mensaje 20');
      expect(sent.at(-1).content).toBe('mensaje 29');
    });
  });
});
