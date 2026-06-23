import { CompleteInviteMemberHandler } from './complete-invite-member/complete-invite-member.handler';
import { InviteMemberHandler } from './invite-member/invite-member.handler';
import { RemoveMemberHandler } from './remove-member/remove-member.handler';

export { CompleteInviteMemberCommand } from './complete-invite-member/complete-invite-member.command';
export { InviteMemberCommand } from './invite-member/invite-member.command';
export { RemoveMemberCommand } from './remove-member/remove-member.command';

export const CommandHandlers = [
  InviteMemberHandler,
  CompleteInviteMemberHandler,
  RemoveMemberHandler,
];
