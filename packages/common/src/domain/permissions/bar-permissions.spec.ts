import { describe, expect, it } from 'vitest';
import { BarPermission } from '../../constants/bar-permissions.type';
import { BarRole } from '../../constants/bar-role.type';
import { getRolePermissions, hasPermission } from './bar-permissions';

const ALL_PERMISSIONS = Object.values(BarPermission) as BarPermission[];

const MANAGER_MUST_NOT_HAVE: BarPermission[] = [
  BarPermission.BAR_REMOVE_MEMBER,
  BarPermission.BAR_CREATE_TABLE,
  BarPermission.BAR_UPDATE_TABLE,
  BarPermission.BAR_DELETE_TABLE,
  BarPermission.BAR_DELETE_ORDER,
  BarPermission.BAR_DELETE_CATEGORY,
  BarPermission.BAR_DELETE_PRODUCT,
  BarPermission.BAR_IMPORT_TEMPLATES,
  BarPermission.BAR_MANAGE_BILLING,
];

const STAFF_MUST_NOT_HAVE: BarPermission[] = [
  ...MANAGER_MUST_NOT_HAVE,
  BarPermission.BAR_VIEW_DASHBOARD,
  BarPermission.BAR_INVITE_MEMBER,
  BarPermission.BAR_CREATE_CATEGORY,
  BarPermission.BAR_UPDATE_CATEGORY,
  BarPermission.BAR_CREATE_PRODUCT,
  BarPermission.BAR_UPDATE_PRODUCT,
  BarPermission.BAR_CREATE_SHIFT,
  BarPermission.BAR_DELETE_SHIFT,
  BarPermission.BAR_MANAGE_PRINTER,
];

describe('bar permissions', () => {
  describe('OWNER', () => {
    it('should hold every permission there is', () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission(BarRole.OWNER, permission), permission).toBe(true);
      }
    });

    it('should list billing among its permissions', () => {
      expect(getRolePermissions(BarRole.OWNER)).toContain(BarPermission.BAR_MANAGE_BILLING);
    });

    it('should list exactly what hasPermission grants it, so a new permission cannot go missing', () => {
      const listed = getRolePermissions(BarRole.OWNER);

      expect([...listed].sort()).toEqual([...ALL_PERMISSIONS].sort());
    });
  });

  describe('MANAGER', () => {
    it('should run the day to day without owning the bar', () => {
      expect(hasPermission(BarRole.MANAGER, BarPermission.BAR_VIEW_DASHBOARD)).toBe(true);
      expect(hasPermission(BarRole.MANAGER, BarPermission.BAR_INVITE_MEMBER)).toBe(true);
      expect(hasPermission(BarRole.MANAGER, BarPermission.BAR_CREATE_PRODUCT)).toBe(true);
      expect(hasPermission(BarRole.MANAGER, BarPermission.BAR_MANAGE_PRINTER)).toBe(true);
    });

    it('should be denied the owner-only powers', () => {
      for (const permission of MANAGER_MUST_NOT_HAVE) {
        expect(hasPermission(BarRole.MANAGER, permission), permission).toBe(false);
      }
    });
  });

  describe('STAFF', () => {
    it('should work the floor', () => {
      expect(hasPermission(BarRole.STAFF, BarPermission.BAR_CREATE_ORDER)).toBe(true);
      expect(hasPermission(BarRole.STAFF, BarPermission.BAR_CHECKOUT_ORDER)).toBe(true);
      expect(hasPermission(BarRole.STAFF, BarPermission.BAR_UPDATE_PRODUCT_STOCK)).toBe(true);
      expect(hasPermission(BarRole.STAFF, BarPermission.BAR_VIEW_PRINTER)).toBe(true);
    });

    it('should be denied everything above the floor', () => {
      for (const permission of STAFF_MUST_NOT_HAVE) {
        expect(hasPermission(BarRole.STAFF, permission), permission).toBe(false);
      }
    });
  });

  it('should keep every role a subset of the one above it', () => {
    const staff = ALL_PERMISSIONS.filter((p) => hasPermission(BarRole.STAFF, p));
    const manager = ALL_PERMISSIONS.filter((p) => hasPermission(BarRole.MANAGER, p));

    for (const permission of staff) {
      expect(manager, permission).toContain(permission);
    }

    expect(manager.length).toBeGreaterThan(staff.length);
  });
});
