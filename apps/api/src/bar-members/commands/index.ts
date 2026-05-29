import { InviteMemberHandler } from './invite-member/invite-member.handler';
import { RemoveMemberHandler } from './remove-member/remove-member.handler';

export { InviteMemberCommand } from './invite-member/invite-member.command';
export { RemoveMemberCommand } from './remove-member/remove-member.command';

export const CommandHandlers = [InviteMemberHandler, RemoveMemberHandler];
