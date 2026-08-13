import { EstablishmentId } from './establishment.interface';

export type PrinterConfigId = string & { readonly __brand: 'PrinterConfigId' };

export interface RegisterPrinterIpDto {
  establishmentId: EstablishmentId;
  ipAddress: string;

  port?: number;
}

export interface PrinterConnectionDetailsDto {
  ipAddress: string;
  port: number;
  token: string;
}

export interface PrinterStatusDto {
  establishmentId: EstablishmentId;
  isOnline: boolean;
  ipAddress: string | null;
  port: number;
  lastSeenAt: string | null;
}

export interface GenerateDeviceKeyResponseDto {
  deviceKey: string;
}

export interface PrintTicketItemDto {
  name: string;
  quantity: number;
  price: string;
  total: string;
}

export interface PrintTicketPayloadDto {
  type: 'order' | 'raw';
  establishmentName?: string;
  table?: string;
  date?: string;
  items?: PrintTicketItemDto[];
  total?: string;
  currency?: string;
  notes?: string;
  rawText?: string;
}

export type PrintJobStatus = 'PENDING' | 'PRINTING' | 'PRINTED' | 'FAILED';

export interface PrintJobDto {
  id: string;
  status: PrintJobStatus;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface EnqueuePrintJobResponseDto {
  jobId: string;
}

export interface ClaimedPrintJobDto {
  id: string;
  payload: PrintTicketPayloadDto;
}

export interface PrintJobResultDto {
  status: 'printed' | 'failed';
  error?: string;
}

export interface PrinterPairingResult {
  establishmentId: EstablishmentId;
  deviceKey: string;
}

export interface PrinterPairingCodeResponse {
  code: string;
}
