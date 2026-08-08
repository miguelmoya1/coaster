import { GetTimeSheetIntegrityHandler } from './handlers/get-time-sheet-integrity.handler';
import { GetWorkdaysHandler } from './handlers/get-workdays.handler';

export { GetTimeSheetIntegrityQuery } from './impl/get-time-sheet-integrity.query';
export { GetWorkdaysQuery } from './impl/get-workdays.query';

export const QueryHandlers = [GetWorkdaysHandler, GetTimeSheetIntegrityHandler];
