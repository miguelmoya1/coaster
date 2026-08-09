import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AdminAuditAction,
  BarBillingSource,
  BarRole,
  ClockState,
  ErrorCodes,
  Role,
  StockStatus,
  SubscriptionStatus,
  TimeEntryAction,
  TimeEntryType,
  WorkdayDiscrepancy,
} from '@coaster/common';
import { describe, expect, it } from 'vitest';

// Vitest runs from apps/web, which is where the translations the app ships live.
const load = (lang: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'public/i18n', `${lang}.json`), 'utf8'));

const flatten = (value: Record<string, unknown>, prefix = ''): Record<string, string> =>
  Object.entries(value).reduce<Record<string, string>>((keys, [key, child]) => {
    const path = `${prefix}${key}`;

    return child !== null && typeof child === 'object'
      ? { ...keys, ...flatten(child as Record<string, unknown>, `${path}.`) }
      : { ...keys, [path]: String(child) };
  }, {});

const es = flatten(load('es'));
const en = flatten(load('en'));

/**
 * Keys the interface assembles at runtime, so nothing ever points at them in the source. A value
 * added to one of these enums without its label shows up in the screen as the raw key.
 */
const dynamicFamilies: { prefix: string; values: string[]; builtIn: string }[] = [
  { prefix: 'admin.audit_action.', values: Object.values(AdminAuditAction), builtIn: 'audit-list' },
  { prefix: 'admin.billing_source.', values: Object.values(BarBillingSource), builtIn: 'billing-badge' },
  { prefix: 'admin.subscription_status.', values: Object.values(SubscriptionStatus), builtIn: 'status-chip' },
  { prefix: 'admin.user_role.', values: Object.values(Role), builtIn: 'admin-users' },
  { prefix: 'common.role.', values: Object.values(BarRole), builtIn: 'staff-member-card' },
  { prefix: 'roster.time_tracking.type_', values: Object.values(TimeEntryType), builtIn: 'workday-card' },
  { prefix: 'roster.time_tracking.action_', values: Object.values(TimeEntryAction), builtIn: 'workday-card' },
  { prefix: 'roster.time_tracking.state_', values: Object.values(ClockState), builtIn: 'clock-card' },
  {
    prefix: 'roster.time_tracking.discrepancy_',
    values: Object.values(WorkdayDiscrepancy),
    builtIn: 'workday-card',
  },
];

describe('translations', () => {
  it('should say the same things in both languages', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('should leave no translation empty', () => {
    expect(Object.entries({ ...es, ...en }).filter(([, value]) => !value.trim())).toEqual([]);
  });

  describe('errors coming back from the API', () => {
    it.each(Object.values(ErrorCodes))('should have something to say about %s', (code) => {
      expect(es[code], `${code} missing from es.json`).toBeTruthy();
      expect(en[code], `${code} missing from en.json`).toBeTruthy();
    });
  });

  describe('keys built at runtime', () => {
    it.each(dynamicFamilies)('should label every value under $prefix ($builtIn)', ({ prefix, values }) => {
      const missing = values.filter((value) => !es[prefix + value.toLowerCase()] || !en[prefix + value.toLowerCase()]);

      expect(missing).toEqual([]);
    });

    it('should label every stock status', () => {
      const missing = Object.values(StockStatus).filter(
        (status) => !es[`pantry.status.${status}`] || !en[`pantry.status.${status}`],
      );

      expect(missing).toEqual([]);
    });
  });
});
