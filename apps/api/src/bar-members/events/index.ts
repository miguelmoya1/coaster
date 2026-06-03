import { MemberRemovedHandler } from './member-removed/member-removed.handler';

export * from './member-removed/member-removed.event'; // quitar.
export * from './member-removed/member-removed.handler';

export const EventHandlers = [MemberRemovedHandler];
