import { GenerateDeviceKeyHandler } from './handlers/generate-device-key.handler';
import { RegisterPrinterIpHandler } from './handlers/register-printer-ip.handler';

export { GenerateDeviceKeyCommand } from './impl/generate-device-key.command';
export { RegisterPrinterIpCommand } from './impl/register-printer-ip.command';

export const CommandHandlers = [RegisterPrinterIpHandler, GenerateDeviceKeyHandler];
