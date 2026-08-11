import type { User } from '@coaster/common';
import {
  DEFAULT_ESTABLISHMENT_MODULES,
  ErrorCodes,
  asEstablishmentId,
  asUserId,
  EstablishmentRole,
} from '@coaster/common';
import { ConfigService } from '@nestjs/config';
import { SecurityRepository } from '@coaster/core';
import { AiUsageRepository } from '../../data-access/ai-usage.repository';
import { DbRole } from '@coaster/core/db';
import { ForbiddenException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { generateText, streamText } from 'ai';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { ExecuteAiCommand } from '../impl/execute-ai.command';
import { ExecuteAiHandler } from './execute-ai.handler';

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(),
  };
});

describe('ExecuteAiHandler', () => {
  const mockAiUsage = { messagesThisPeriod: vi.fn().mockResolvedValue(0), countMessage: vi.fn().mockResolvedValue(1) };

  let handler: ExecuteAiHandler;
  let queryBus: Mocked<QueryBus>;
  let securityRepository: Mocked<SecurityRepository>;

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };
    const mockSecurityRepository = {
      getUserRole: vi.fn(),
      getEstablishmentMemberRole: vi.fn(),
      getEnabledModules: vi.fn().mockResolvedValue(DEFAULT_ESTABLISHMENT_MODULES),
      isOnTrial: vi.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteAiHandler,
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
        { provide: SecurityRepository, useValue: mockSecurityRepository },
        { provide: AiUsageRepository, useValue: mockAiUsage },
        { provide: ConfigService, useValue: { get: vi.fn(() => undefined) } },
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
    const establishmentId = asEstablishmentId('establishment-1');
    const user = { id: asUserId('user-1'), name: 'Juan Carlos', language: 'es' } as User;
    const prompt = 'Crea la mesa 3';
    const command = new ExecuteAiCommand(establishmentId, prompt, user);

    it('should throw ForbiddenException if user is not a member of the establishment and not an admin', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepository.getEstablishmentMemberRole.mockResolvedValue(null);

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
      securityRepository.getEstablishmentMemberRole.mockResolvedValue({ role: EstablishmentRole.STAFF, active: true });
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'Mesa creada correctamente.' });

      const result = await handler.execute(command);

      expect(securityRepository.getEstablishmentMemberRole).toHaveBeenCalledWith(user.id, establishmentId);
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
      const cmdWithMessages = new ExecuteAiCommand(establishmentId, 'Crear mesa 3', user, customMessages);
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

      await handler.execute(new ExecuteAiCommand(establishmentId, 'mensaje 29', user, longHistory));

      const sent = (generateText as any).mock.calls.at(-1)[0].messages;
      expect(sent).toHaveLength(10);
      expect(sent.at(0).content).toBe('mensaje 20');
      expect(sent.at(-1).content).toBe('mensaje 29');
    });

    it('should let the model chain tools instead of stopping after the first call', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'ok' });

      await handler.execute(command);

      const options = (generateText as any).mock.calls.at(-1)[0];
      expect(options.stopWhen).toBeDefined();
      expect(Object.keys(options.tools)).toEqual(
        expect.arrayContaining(['createOrder', 'getEstablishmentStats', 'listMembers', 'listShifts', 'deleteProduct']),
      );
    });

    it('should tell the model which permissions the role actually grants', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepository.getEstablishmentMemberRole.mockResolvedValue({ role: EstablishmentRole.STAFF, active: true });
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockResolvedValue({ text: 'ok' });

      await handler.execute(command);

      const { system } = (generateText as any).mock.calls.at(-1)[0];
      expect(system).toContain('establishment:create-order');
      expect(system).not.toContain('establishment:delete-product');
    });

    it('should keep the streamed transcript as the final answer across multiple steps', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]);
      (streamText as any).mockReturnValue({
        textStream: (async function* () {
          yield 'Voy a mirarlo. ';
          yield 'Hoy llevas 240 €.';
        })(),
        // A multi-step run only exposes the last step here, which is not what the user heard.
        text: Promise.resolve('Hoy llevas 240 €.'),
      });

      const deltas: string[] = [];
      const result = await handler.execute(
        new ExecuteAiCommand(establishmentId, '¿cuánto llevamos hoy?', user, undefined, (delta) => deltas.push(delta)),
      );

      expect(deltas).toEqual(['Voy a mirarlo. ', 'Hoy llevas 240 €.']);
      expect(result).toEqual({ text: 'Voy a mirarlo. Hoy llevas 240 €.' });
    });

    it('should refuse once the establishment has spent its monthly allowance', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      mockAiUsage.messagesThisPeriod.mockResolvedValue(500);

      await expect(handler.execute(command)).rejects.toThrow(ErrorCodes.AI_QUOTA_EXCEEDED);
    });

    it('should hold an establishment still on trial to a smaller allowance', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      securityRepository.isOnTrial.mockResolvedValue(true);
      mockAiUsage.messagesThisPeriod.mockResolvedValue(100);

      await expect(handler.execute(command)).rejects.toThrow(ErrorCodes.AI_QUOTA_EXCEEDED);
    });

    it('should not spend an allowance on a gateway that never answered', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockRejectedValueOnce(new Error('gateway down'));
      mockAiUsage.countMessage.mockClear();

      await handler.execute(command);

      expect(mockAiUsage.countMessage).not.toHaveBeenCalled();
    });

    it('should surface a gateway failure as a translatable error', async () => {
      securityRepository.getUserRole.mockResolvedValue(DbRole.ADMIN);
      queryBus.execute.mockResolvedValue([]);
      (generateText as any).mockRejectedValue(new Error('gateway down'));

      const result = await handler.execute(command);

      expect(result).toEqual({
        text: 'ai_voice.errors.ai_gateway_failed',
        isError: true,
        errorKey: 'ai_voice.errors.ai_gateway_failed',
      });
    });
  });
});
