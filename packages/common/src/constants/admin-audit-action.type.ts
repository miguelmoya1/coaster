export const AdminAuditAction = {
  BAR_PLAN_GRANTED: 'BAR_PLAN_GRANTED',
  BAR_PLAN_REVOKED: 'BAR_PLAN_REVOKED',
  BAR_RENAMED: 'BAR_RENAMED',
  BAR_MEMBER_ROLE_CHANGED: 'BAR_MEMBER_ROLE_CHANGED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_ACTIVATION_CHANGED: 'USER_ACTIVATION_CHANGED',
} as const;

export type AdminAuditAction = (typeof AdminAuditAction)[keyof typeof AdminAuditAction];

export const AdminAuditTargetType = {
  BAR: 'BAR',
  USER: 'USER',
} as const;

export type AdminAuditTargetType = (typeof AdminAuditTargetType)[keyof typeof AdminAuditTargetType];
