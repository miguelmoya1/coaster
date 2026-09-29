import { describe, expect, it } from 'vitest';
import * as common from './index';

describe('Common', () => {
  it('should export the shared permission model', () => {
    expect(typeof common.hasPermission).toBe('function');
    expect(typeof common.getRolePermissions).toBe('function');
    expect(common.ROLE_PERMISSIONS).toBeDefined();
  });

  it('should export the enums the apps gate on', () => {
    expect(common.EstablishmentRole.OWNER).toBe('OWNER');
    expect(common.Role.ADMIN).toBe('ADMIN');
    expect(common.SubscriptionPlan.PRO).toBe('PRO');
    expect(common.EstablishmentBillingSource.MANUAL).toBe('MANUAL');
    expect(common.AdminAuditAction.ESTABLISHMENT_PLAN_GRANTED).toBe('ESTABLISHMENT_PLAN_GRANTED');
  });
});
