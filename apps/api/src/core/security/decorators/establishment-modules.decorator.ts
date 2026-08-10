import { EstablishmentModule } from '@coaster/common';
import { SetMetadata } from '@nestjs/common';

export const ESTABLISHMENT_MODULES_KEY = 'establishment_modules';
export const RequiresModule = (...modules: EstablishmentModule[]) => SetMetadata(ESTABLISHMENT_MODULES_KEY, modules);
