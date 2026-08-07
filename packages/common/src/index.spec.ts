import { describe, expect, it } from 'vitest';
import * as common from './index';

describe('Common', () => {
  it('should export the shared permission model', () => {
    expect(typeof common.hasPermission).toBe('function');
    expect(typeof common.getRolePermissions).toBe('function');
    expect(common.ROLE_PERMISSIONS).toBeDefined();
  });

  it('should export the enums the apps gate on', () => {
    expect(common.BarRole.OWNER).toBe('OWNER');
    expect(common.Role.ADMIN).toBe('ADMIN');
    expect(common.SubscriptionPlan.PRO).toBe('PRO');
    expect(common.BarBillingSource.MANUAL).toBe('MANUAL');
    expect(common.AdminAuditAction.BAR_PLAN_GRANTED).toBe('BAR_PLAN_GRANTED');
  });
});
