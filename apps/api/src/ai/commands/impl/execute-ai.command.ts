import type { AiMessage, BarId, User } from '@coaster/common';

export type AiDeltaListener = (delta: string) => void;

export class ExecuteAiCommand {
  constructor(
    public readonly barId: BarId,
    public readonly prompt: string,
    public readonly user: User,
    public readonly messages?: AiMessage[],
    public readonly onDelta?: AiDeltaListener,
  ) {}
}
