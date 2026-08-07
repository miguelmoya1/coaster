import { ClaimNextPrintJobHandler } from './handlers/claim-next-print-job.handler';
import { GetPrinterConnectionHandler } from './handlers/get-printer-connection.handler';
import { GetPrinterStatusHandler } from './handlers/get-printer-status.handler';
import { GetPrintJobHandler } from './handlers/get-print-job.handler';

export { ClaimNextPrintJobQuery } from './impl/claim-next-print-job.query';
export { GetPrinterConnectionQuery } from './impl/get-printer-connection.query';
export { GetPrinterStatusQuery } from './impl/get-printer-status.query';
export { GetPrintJobQuery } from './impl/get-print-job.query';

export const QueryHandlers = [
  GetPrinterConnectionHandler,
  GetPrinterStatusHandler,
  ClaimNextPrintJobHandler,
  GetPrintJobHandler,
];
