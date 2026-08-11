import { Language } from '../constants/language.type';
import { EstablishmentModule } from '../constants/establishment-module.type';
import { EstablishmentRole } from '../constants/establishment-role.type';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

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
  /** What the establishment writes its catalogue and its menu in. */
  language: Language;
  /** Null until an owner has answered the onboarding questions for the first time. */
  configuredAt: string | null;
}

export interface CreateEstablishmentDto {
  name: string;
}

export interface UpdateEstablishmentSettingsDto {
  modules: EstablishmentModule[];
  language?: Language;
}
