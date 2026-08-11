import { EnqueuePrintJobHandler } from './handlers/enqueue-print-job.handler';
import { GenerateDeviceKeyHandler } from './handlers/generate-device-key.handler';
import { IssuePairingHandler } from './handlers/issue-pairing.handler';
import { RedeemPairingHandler } from './handlers/redeem-pairing.handler';
import { RegisterPrinterIpHandler } from './handlers/register-printer-ip.handler';
import { ReportPrintJobResultHandler } from './handlers/report-print-job-result.handler';

export { EnqueuePrintJobCommand } from './impl/enqueue-print-job.command';
export { GenerateDeviceKeyCommand } from './impl/generate-device-key.command';
export { IssuePairingCommand } from './impl/issue-pairing.command';
export { RedeemPairingCommand } from './impl/redeem-pairing.command';
export { RegisterPrinterIpCommand } from './impl/register-printer-ip.command';
export { ReportPrintJobResultCommand } from './impl/report-print-job-result.command';

export const CommandHandlers = [
  RegisterPrinterIpHandler,
  GenerateDeviceKeyHandler,
  EnqueuePrintJobHandler,
  ReportPrintJobResultHandler,
  IssuePairingHandler,
  RedeemPairingHandler,
];
