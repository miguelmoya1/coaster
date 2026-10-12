import type { Brand } from './brand.type';

export type EstablishmentId = Brand<string, 'EstablishmentId'>;

export const asEstablishmentId = (id: string): EstablishmentId => id as EstablishmentId;
