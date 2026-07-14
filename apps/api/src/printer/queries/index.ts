import { GetPrinterConnectionHandler } from './handlers/get-printer-connection.handler';
import { GetPrinterStatusHandler } from './handlers/get-printer-status.handler';

export { GetPrinterConnectionQuery } from './impl/get-printer-connection.query';
export { GetPrinterStatusQuery } from './impl/get-printer-status.query';

export const QueryHandlers = [GetPrinterConnectionHandler, GetPrinterStatusHandler];
