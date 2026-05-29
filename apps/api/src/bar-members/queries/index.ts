import { GetMemberMeHandler } from './get-member-me/get-member-me.handler';
import { GetMembersHandler } from './get-members/get-members.handler';

export { GetMemberMeQuery } from './get-member-me/get-member-me.query';
export { GetMembersQuery } from './get-members/get-members.query';

export const QueryHandlers = [GetMembersHandler, GetMemberMeHandler];
