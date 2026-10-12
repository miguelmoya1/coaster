import type { EstablishmentId, Language } from '@coaster/core';
import { EstablishmentModule } from './establishment-module.type';

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
