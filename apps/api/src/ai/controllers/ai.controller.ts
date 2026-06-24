import type { BarId, User } from '@coaster/common';
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CurrentUser, FirebaseAuthGuard } from '../../auth';
import { BarPermissionsGuard } from '../../core';
import { ExecuteAiCommand } from '../commands';

@Controller('bars/:barId/ai')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class AiController {
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
}
