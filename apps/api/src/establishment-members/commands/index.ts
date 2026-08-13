import { CompleteInviteMemberHandler } from './handlers/complete-invite-member.handler';
import { InviteMemberHandler } from './handlers/invite-member.handler';
import { RemoveMemberHandler } from './handlers/remove-member.handler';
import { UpdateMemberRoleHandler } from './handlers/update-member-role.handler';

export { CompleteInviteMemberCommand } from './impl/complete-invite-member.command';
export { InviteMemberCommand } from './impl/invite-member.command';
export { RemoveMemberCommand } from './impl/remove-member.command';
export { UpdateMemberRoleCommand } from './impl/update-member-role.command';

export const CommandHandlers = [
  CompleteInviteMemberHandler,
  InviteMemberHandler,
  RemoveMemberHandler,
  UpdateMemberRoleHandler,
];
