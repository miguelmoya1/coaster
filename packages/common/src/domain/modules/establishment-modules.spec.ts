import { describe, expect, it } from 'vitest';
import { EstablishmentModule } from '../../constants/establishment-module.type';
import { isModuleEnabled, resolveModules } from './establishment-modules';

describe('resolveModules', () => {
  it('should keep time tracking on even when nothing is asked for', () => {
    expect(resolveModules([])).toEqual([EstablishmentModule.TIME_TRACKING]);
  });

  it('should keep time tracking on when the caller tries to leave it out', () => {
    expect(resolveModules([EstablishmentModule.INVENTORY])).toContain(EstablishmentModule.TIME_TRACKING);
  });

  it('should pull inventory in with orders, because an order is products from the catalogue', () => {
    expect(resolveModules([EstablishmentModule.ORDERS])).toEqual([
      EstablishmentModule.TIME_TRACKING,
      EstablishmentModule.ORDERS,
      EstablishmentModule.INVENTORY,
    ]);
  });

  it('should let inventory stand on its own, for a shop that never takes an order', () => {
    expect(resolveModules([EstablishmentModule.INVENTORY])).toEqual([
      EstablishmentModule.TIME_TRACKING,
      EstablishmentModule.INVENTORY,
    ]);
  });

  it('should not repeat a module asked for twice', () => {
    expect(
      resolveModules([EstablishmentModule.ORDERS, EstablishmentModule.ORDERS, EstablishmentModule.INVENTORY]),
    ).toEqual([EstablishmentModule.TIME_TRACKING, EstablishmentModule.ORDERS, EstablishmentModule.INVENTORY]);
  });

  it('should return the same order whatever order it was asked in, so stored rows compare equal', () => {
    const one = resolveModules([EstablishmentModule.INVENTORY, EstablishmentModule.ORDERS]);
    const other = resolveModules([EstablishmentModule.ORDERS, EstablishmentModule.INVENTORY]);

    expect(one).toEqual(other);
  });
});

describe('isModuleEnabled', () => {
  it('should report time tracking as on for an establishment that stored nothing', () => {
    expect(isModuleEnabled([], EstablishmentModule.TIME_TRACKING)).toBe(true);
  });

  it('should report orders as off when only time tracking is stored', () => {
    expect(isModuleEnabled([EstablishmentModule.TIME_TRACKING], EstablishmentModule.ORDERS)).toBe(false);
  });

  it('should report inventory as on for an establishment that only stored orders', () => {
    expect(isModuleEnabled([EstablishmentModule.ORDERS], EstablishmentModule.INVENTORY)).toBe(true);
  });
});
