import { GetCurrentWorkdayHandler } from './handlers/get-current-workday.handler';
import { GetTimeSheetIntegrityHandler } from './handlers/get-time-sheet-integrity.handler';
import { GetWorkdaysHandler } from './handlers/get-workdays.handler';

export { GetCurrentWorkdayQuery } from './impl/get-current-workday.query';
export { GetTimeSheetIntegrityQuery } from './impl/get-time-sheet-integrity.query';
export { GetWorkdaysQuery } from './impl/get-workdays.query';

export const QueryHandlers = [GetWorkdaysHandler, GetCurrentWorkdayHandler, GetTimeSheetIntegrityHandler];
