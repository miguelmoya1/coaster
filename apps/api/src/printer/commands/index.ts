import { EnqueuePrintJobHandler } from './handlers/enqueue-print-job.handler';
import { GenerateDeviceKeyHandler } from './handlers/generate-device-key.handler';
import { RegisterPrinterIpHandler } from './handlers/register-printer-ip.handler';
import { ReportPrintJobResultHandler } from './handlers/report-print-job-result.handler';

export { EnqueuePrintJobCommand } from './impl/enqueue-print-job.command';
export { GenerateDeviceKeyCommand } from './impl/generate-device-key.command';
export { RegisterPrinterIpCommand } from './impl/register-printer-ip.command';
export { ReportPrintJobResultCommand } from './impl/report-print-job-result.command';

export const CommandHandlers = [
  RegisterPrinterIpHandler,
  GenerateDeviceKeyHandler,
  EnqueuePrintJobHandler,
  ReportPrintJobResultHandler,
];
