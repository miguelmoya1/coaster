import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { AiMessage, AiResponse, BarId, User } from '@coaster/common';
import { BarPermissionsGuard } from '@coaster/core';
import { Body, Controller, Logger, Param, Post, Res, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { FastifyReply } from 'fastify';
import { ExecuteAiCommand } from '../commands';

@Controller('bars/:barId/ai')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class AiController {
  private readonly _logger = new Logger(AiController.name);

  constructor(private readonly _commandBus: CommandBus) {}

  @Post()
  async executeCommand(
    @Param('barId') barId: BarId,
    @Body('prompt') prompt: string,
    @CurrentUser() user: User,
    @Body('messages') messages?: any[],
  ) {
    return this._commandBus.execute<ExecuteAiCommand, { text: string }>(
      new ExecuteAiCommand(barId, prompt, user, messages),
    );
  }

  @Post('stream')
  async streamCommand(
    @Param('barId') barId: BarId,
    @Body('prompt') prompt: string,
    @CurrentUser() user: User,
    @Res() reply: FastifyReply,
    @Body('messages') messages?: AiMessage[],
  ): Promise<void> {
    const inheritedHeaders = reply.getHeaders() as Record<string, number | string | string[]>;
    reply.hijack();

    reply.raw.writeHead(200, {
      ...inheritedHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await this._commandBus.execute<ExecuteAiCommand, AiResponse>(
        new ExecuteAiCommand(barId, prompt, user, messages, (delta) => send('delta', { delta })),
      );

      send('done', result);
    } catch {
      send('done', {
        text: 'ai_voice.errors.ai_gateway_failed',
        isError: true,
        errorKey: 'ai_voice.errors.ai_gateway_failed',
      });
    } finally {
      reply.raw.end();
    }
  }
}
