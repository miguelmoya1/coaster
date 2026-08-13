import { describe, expect, it } from 'vitest';
import { EstablishmentPermission } from '../../constants/establishment-permissions.type';
import { EstablishmentRole } from '../../constants/establishment-role.type';
import { getRolePermissions, hasPermission } from './establishment-permissions';

const ALL_PERMISSIONS = Object.values(EstablishmentPermission) as EstablishmentPermission[];

const MANAGER_MUST_NOT_HAVE: EstablishmentPermission[] = [
  EstablishmentPermission.ESTABLISHMENT_REMOVE_MEMBER,
  EstablishmentPermission.ESTABLISHMENT_CREATE_TABLE,
  EstablishmentPermission.ESTABLISHMENT_UPDATE_TABLE,
  EstablishmentPermission.ESTABLISHMENT_DELETE_TABLE,
  EstablishmentPermission.ESTABLISHMENT_DELETE_ORDER,
  EstablishmentPermission.ESTABLISHMENT_DELETE_CATEGORY,
  EstablishmentPermission.ESTABLISHMENT_DELETE_PRODUCT,
  EstablishmentPermission.ESTABLISHMENT_IMPORT_CATALOGUE,
  EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING,
  EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS_HISTORY,
  EstablishmentPermission.ESTABLISHMENT_VIEW_LABOR_COST,
];

const STAFF_MUST_NOT_HAVE: EstablishmentPermission[] = [
  ...MANAGER_MUST_NOT_HAVE,
  EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS,
  EstablishmentPermission.ESTABLISHMENT_INVITE_MEMBER,
  EstablishmentPermission.ESTABLISHMENT_CREATE_CATEGORY,
  EstablishmentPermission.ESTABLISHMENT_UPDATE_CATEGORY,
  EstablishmentPermission.ESTABLISHMENT_CREATE_PRODUCT,
  EstablishmentPermission.ESTABLISHMENT_UPDATE_PRODUCT,
  EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT,
  EstablishmentPermission.ESTABLISHMENT_DELETE_SHIFT,
  EstablishmentPermission.ESTABLISHMENT_MANAGE_PRINTER,
];

describe('establishment permissions', () => {
  describe('OWNER', () => {
    it('should hold every permission there is', () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission(EstablishmentRole.OWNER, permission), permission).toBe(true);
      }
    });

    it('should list billing among its permissions', () => {
      expect(getRolePermissions(EstablishmentRole.OWNER)).toContain(
        EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING,
      );
    });

    it('should list exactly what hasPermission grants it, so a new permission cannot go missing', () => {
      const listed = getRolePermissions(EstablishmentRole.OWNER);

      expect([...listed].sort()).toEqual([...ALL_PERMISSIONS].sort());
    });
  });

  describe('MANAGER', () => {
    it('should run the day to day without owning the establishment', () => {
      expect(hasPermission(EstablishmentRole.MANAGER, EstablishmentPermission.ESTABLISHMENT_VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission(EstablishmentRole.MANAGER, EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS)).toBe(true);
      expect(hasPermission(EstablishmentRole.MANAGER, EstablishmentPermission.ESTABLISHMENT_INVITE_MEMBER)).toBe(true);
      expect(hasPermission(EstablishmentRole.MANAGER, EstablishmentPermission.ESTABLISHMENT_CREATE_PRODUCT)).toBe(true);
      expect(hasPermission(EstablishmentRole.MANAGER, EstablishmentPermission.ESTABLISHMENT_MANAGE_PRINTER)).toBe(true);
    });

    it('should be denied the owner-only powers', () => {
      for (const permission of MANAGER_MUST_NOT_HAVE) {
        expect(hasPermission(EstablishmentRole.MANAGER, permission), permission).toBe(false);
      }
    });
  });

  describe('STAFF', () => {
    it('should work the floor', () => {
      expect(hasPermission(EstablishmentRole.STAFF, EstablishmentPermission.ESTABLISHMENT_VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission(EstablishmentRole.STAFF, EstablishmentPermission.ESTABLISHMENT_CREATE_ORDER)).toBe(true);
      expect(hasPermission(EstablishmentRole.STAFF, EstablishmentPermission.ESTABLISHMENT_CHECKOUT_ORDER)).toBe(true);
      expect(hasPermission(EstablishmentRole.STAFF, EstablishmentPermission.ESTABLISHMENT_UPDATE_PRODUCT_STOCK)).toBe(
        true,
      );
      expect(hasPermission(EstablishmentRole.STAFF, EstablishmentPermission.ESTABLISHMENT_VIEW_PRINTER)).toBe(true);
    });

    it('should be denied everything above the floor', () => {
      for (const permission of STAFF_MUST_NOT_HAVE) {
        expect(hasPermission(EstablishmentRole.STAFF, permission), permission).toBe(false);
      }
    });
  });

  it('should grant each permission once per role, so no tier repeats what it inherits', () => {
    for (const role of Object.values(EstablishmentRole)) {
      const granted = getRolePermissions(role);

      expect([...new Set(granted)].sort(), role).toEqual([...granted].sort());
    }
  });

  it('should keep every role a subset of the one above it', () => {
    const staff = ALL_PERMISSIONS.filter((p) => hasPermission(EstablishmentRole.STAFF, p));
    const manager = ALL_PERMISSIONS.filter((p) => hasPermission(EstablishmentRole.MANAGER, p));

    for (const permission of staff) {
      expect(manager, permission).toContain(permission);
    }

    expect(manager.length).toBeGreaterThan(staff.length);
  });
});
