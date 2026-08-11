import type { AiUsage } from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { ConfigService } from '@nestjs/config';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AiUsageRepository, periodOf } from '../../data-access/ai-usage.repository';
import { DEFAULT_MONTHLY_AI_MESSAGES, DEFAULT_TRIAL_AI_MESSAGES } from '../../domain/quota';
import { GetAiUsageQuery } from '../impl/get-ai-usage.query';

@QueryHandler(GetAiUsageQuery)
export class GetAiUsageHandler implements IQueryHandler<GetAiUsageQuery> {
  constructor(
    private readonly _usage: AiUsageRepository,
    private readonly _security: SecurityRepository,
    private readonly _config: ConfigService,
  ) {}

  async execute(query: GetAiUsageQuery): Promise<AiUsage> {
    const [used, onTrial] = await Promise.all([
      this._usage.messagesThisPeriod(query.establishmentId),
      this._security.isOnTrial(query.establishmentId),
    ]);

    const allowance = onTrial
      ? Number(this._config.get('AI_TRIAL_MONTHLY_MESSAGES') ?? DEFAULT_TRIAL_AI_MESSAGES)
      : Number(this._config.get('AI_MONTHLY_MESSAGES') ?? DEFAULT_MONTHLY_AI_MESSAGES);

    return {
      used,
      allowance,
      remaining: Math.max(0, allowance - used),
      period: periodOf(new Date()),
    };
  }
}
