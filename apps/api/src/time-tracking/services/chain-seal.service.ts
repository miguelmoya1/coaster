import { DbService } from '@coaster/core/db';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { toWorkdayDate } from '../domain/workday';

@Injectable()
export class ChainSealService {
  private readonly _logger = new Logger(ChainSealService.name);

  constructor(private readonly _db: DbService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sealAll(): Promise<number> {
    const heads = await this._db.dbTimeEntry.groupBy({
      by: ['barId'],
      _max: { sequence: true },
    });

    let sealed = 0;

    for (const head of heads) {
      if (head._max.sequence !== null && (await this.seal(head.barId, head._max.sequence))) {
        sealed++;
      }
    }

    if (sealed > 0) {
      this._logger.log(`Sealed the timesheet chain of ${sealed} bars`);
    }

    return sealed;
  }

  async seal(barId: string, sequence: bigint): Promise<boolean> {
    const head = await this._db.dbTimeEntry.findUnique({
      where: { barId_sequence: { barId, sequence } },
      select: { hash: true },
    });

    if (!head) {
      return false;
    }

    const sealedDate = toWorkdayDate(new Date());

    try {
      await this._db.dbTimeEntrySeal.create({
        data: { barId, sealedDate, sequence, headHash: head.hash },
      });

      return true;
    } catch (error) {
      if (this.#isDuplicate(error)) {
        this._logger.debug(`Bar ${barId} was already sealed for ${sealedDate.toISOString().slice(0, 10)}`);
        return false;
      }

      throw error;
    }
  }

  #isDuplicate(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
