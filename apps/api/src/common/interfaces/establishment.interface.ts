import { Language } from '../constants/language.type';
import { EstablishmentModule } from '../constants/establishment-module.type';
import { Brand } from './brand.type';

export type EstablishmentId = Brand<string, 'EstablishmentId'>;

export interface Establishment {
  id: EstablishmentId;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EstablishmentSettings {
  establishmentId: EstablishmentId;
  modules: EstablishmentModule[];
  language: Language;
  markSoldOut: boolean;
  configuredAt: string | null;
}

export interface CreateEstablishmentDto {
  name: string;
}

export interface UpdateEstablishmentSettingsDto {
  modules: EstablishmentModule[];
  language?: Language;
  markSoldOut?: boolean;
}
