export * from './handlers/link-establishment.handler';
export * from './handlers/link-member.handler';
export * from './handlers/retire-member.handler';

import { LinkEstablishmentHandler } from './handlers/link-establishment.handler';
import { LinkMemberHandler } from './handlers/link-member.handler';
import { RetireMemberHandler } from './handlers/retire-member.handler';

export const EventHandlers = [LinkEstablishmentHandler, LinkMemberHandler, RetireMemberHandler];
