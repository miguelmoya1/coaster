import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  AdminAuditAction,
  EstablishmentBillingSource,
  EstablishmentRole,
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
  { prefix: 'admin.billing_source.', values: Object.values(EstablishmentBillingSource), builtIn: 'billing-badge' },
  { prefix: 'admin.subscription_status.', values: Object.values(SubscriptionStatus), builtIn: 'status-chip' },
  { prefix: 'admin.user_role.', values: Object.values(Role), builtIn: 'admin-users' },
  { prefix: 'common.role.', values: Object.values(EstablishmentRole), builtIn: 'staff-member-card' },
  { prefix: 'schedule.time_tracking.type_', values: Object.values(TimeEntryType), builtIn: 'workday-card' },
  { prefix: 'schedule.time_tracking.action_', values: Object.values(TimeEntryAction), builtIn: 'workday-card' },
  { prefix: 'schedule.time_tracking.state_', values: Object.values(ClockState), builtIn: 'clock-card' },
  {
    prefix: 'schedule.time_tracking.discrepancy_',
    values: Object.values(WorkdayDiscrepancy),
    builtIn: 'workday-card',
  },
];

/**
 * Prefixes the interface concatenates onto something it does not own — an API-supplied name, a
 * validator's kind, a status string. Everything under them is reachable even though no literal in
 * the source spells it out.
 */
const runtimePrefixes = [
  ...dynamicFamilies.map((family) => family.prefix),
  'billing.plan_name.',
  'billing.status.',
  'billing.status_badge.',
  'inventory.status.',
  'ai_voice.status.',
  'ai_voice.suggestions.',
  'ai_voice.errors.',
  'dashboard.schedule.status.',
  'members.invite.role_hint_',
  'schedule.exchanges.period_',
  // Seeded catalogue names: the API stores the key and the app translates whatever it is sent.
  'templates.categories.',
  'templates.products.',
];

/** Angular's validator names, rendered straight through by the shared form-field components. */
const validatorKinds = ['required', 'email', 'minLength', 'maxLength', 'min', 'max', 'pattern'];

/** Only what the app itself asks for: a fixture inventing a product name is not a missing key. */
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }

    if (path.endsWith('.spec.ts')) {
      return [];
    }

    return path.endsWith('.ts') || path.endsWith('.html') ? [path] : [];
  });

const sources = sourceFiles(resolve(process.cwd(), 'src'))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

const literalKeys = new Set(
  Array.from(sources.matchAll(/['"`]([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)['"`]/g), (match) => match[1]),
);

const isReachable = (key: string) =>
  literalKeys.has(key) ||
  Object.values(ErrorCodes).includes(key as never) ||
  validatorKinds.includes(key) ||
  runtimePrefixes.some((prefix) => key.startsWith(prefix));

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

  /*
   * Renaming a key in the source and forgetting the file leaves the raw key on someone's screen,
   * and the reverse quietly grows dead weight. Neither shows up in any other test.
   */
  it('should define every key the source asks for', () => {
    const asked = Array.from(literalKeys).filter(
      (key) =>
        key.includes('.') &&
        // A prefix the app concatenates onto is not itself a key.
        !runtimePrefixes.includes(key) &&
        !key.endsWith('_') &&
        Object.keys(es).some((known) => known.split('.')[0] === key.split('.')[0]),
    );

    expect(asked.filter((key) => !(key in es))).toEqual([]);
  });

  it('should carry no key the app never asks for', () => {
    expect(Object.keys(es).filter((key) => !isReachable(key))).toEqual([]);
  });

  describe('keys built at runtime', () => {
    it.each(dynamicFamilies)('should label every value under $prefix ($builtIn)', ({ prefix, values }) => {
      const missing = values.filter((value) => !es[prefix + value.toLowerCase()] || !en[prefix + value.toLowerCase()]);

      expect(missing).toEqual([]);
    });

    it('should label every stock status', () => {
      const missing = Object.values(StockStatus).filter(
        (status) => !es[`inventory.status.${status}`] || !en[`inventory.status.${status}`],
      );

      expect(missing).toEqual([]);
    });
  });
});
