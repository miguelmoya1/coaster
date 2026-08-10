export const AdminAuditAction = {
  BAR_PLAN_GRANTED: 'BAR_PLAN_GRANTED',
  BAR_PLAN_REVOKED: 'BAR_PLAN_REVOKED',
  BAR_RENAMED: 'BAR_RENAMED',
  BAR_MEMBER_ROLE_CHANGED: 'BAR_MEMBER_ROLE_CHANGED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_ACTIVATION_CHANGED: 'USER_ACTIVATION_CHANGED',
  TIME_ENTRY_CREATED: 'TIME_ENTRY_CREATED',
  TIME_ENTRY_AMENDED: 'TIME_ENTRY_AMENDED',
  TIME_ENTRY_VOIDED: 'TIME_ENTRY_VOIDED',
} as const;

export type AdminAuditAction = (typeof AdminAuditAction)[keyof typeof AdminAuditAction];

export const AdminAuditTargetType = {
  BAR: 'BAR',
  USER: 'USER',
  TIME_ENTRY: 'TIME_ENTRY',
} as const;

export type AdminAuditTargetType = (typeof AdminAuditTargetType)[keyof typeof AdminAuditTargetType];
