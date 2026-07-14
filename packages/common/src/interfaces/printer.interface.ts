import { BarId } from './bar.interface';

export type PrinterConfigId = string & { readonly __brand: 'PrinterConfigId' };

export interface RegisterPrinterIpDto {
  barId: BarId;
  ipAddress: string;
}

export interface PrinterConnectionDetailsDto {
  ipAddress: string;
  port: number;
  token: string;
}

export interface PrinterStatusDto {
  barId: BarId;
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
  barName?: string;
  table?: string;
  date?: string;
  items?: PrintTicketItemDto[];
  total?: string;
  currency?: string;
  notes?: string;
  rawText?: string;
}
