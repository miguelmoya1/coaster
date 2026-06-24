import type { BarId, User } from '@coaster/common';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ExecuteAiCommand {
  constructor(
    public readonly barId: BarId,
    public readonly prompt: string,
    public readonly user: User,
    public readonly messages?: AiMessage[],
  ) {}
}
