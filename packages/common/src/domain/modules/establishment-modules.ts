import { EstablishmentModule } from '../../constants/establishment-module.type';

const ALWAYS_ON: EstablishmentModule[] = [EstablishmentModule.TIME_TRACKING];

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
