import type { TimeSheetIntegrity } from '@coaster/common';
import { asTimeEntryId } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TimeEntriesReadRepository } from '../../data-access/time-entries.read.repository';
import { verifyChain } from '../../domain/time-entry-chain';
import { verifySeals } from '../../domain/time-entry-seal';
import { GetTimeSheetIntegrityQuery } from '../impl/get-time-sheet-integrity.query';

@QueryHandler(GetTimeSheetIntegrityQuery)
export class GetTimeSheetIntegrityHandler implements IQueryHandler<GetTimeSheetIntegrityQuery, TimeSheetIntegrity> {
  constructor(private readonly _readRepo: TimeEntriesReadRepository) {}

  async execute(query: GetTimeSheetIntegrityQuery): Promise<TimeSheetIntegrity> {
    const chain = (await this._readRepo.findChain(query.barId)).map((entry) => ({
      ...entry,
      userSnapshot: entry.userSnapshot as { name: string; email: string },
    }));
    const result = verifyChain(chain);
    const seals = verifySeals(chain, await this._readRepo.findSeals(query.barId));

    return {
      barId: query.barId,
      checkedEntries: result.checked,
      valid: result.valid && seals.valid,
      brokenAt: result.brokenAt ? asTimeEntryId(result.brokenAt) : null,
      checkedSeals: seals.checked,
      sealsValid: seals.valid,
      brokenSealDate: seals.brokenAt,
    };
  }
}
