import { EstablishmentModule } from '../../constants/establishment-module.type';

/**
 * Modules that cannot be switched off. The working-time register is a legal obligation for every
 * employer, so an establishment without it could not lawfully use the product at all.
 */
const ALWAYS_ON: EstablishmentModule[] = [EstablishmentModule.TIME_TRACKING];

/**
 * A module that cannot stand on its own. An order is products taken from the catalogue, so orders
 * without inventory is a till with nothing to sell.
 */
const REQUIRES: Partial<Record<EstablishmentModule, EstablishmentModule[]>> = {
  [EstablishmentModule.ORDERS]: [EstablishmentModule.INVENTORY],
};

export function resolveModules(requested: readonly EstablishmentModule[]): EstablishmentModule[] {
  const resolved = new Set<EstablishmentModule>([...ALWAYS_ON, ...requested]);

  for (const module of [...resolved]) {
    for (const dependency of REQUIRES[module] ?? []) {
      resolved.add(dependency);
    }
  }

  return Object.values(EstablishmentModule).filter((module) => resolved.has(module));
}

export function isModuleEnabled(enabled: readonly EstablishmentModule[], module: EstablishmentModule): boolean {
  return resolveModules(enabled).includes(module);
}
