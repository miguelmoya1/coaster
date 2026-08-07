import { GetMembersQuery, InviteMemberCommand, RemoveMemberCommand } from '@coaster/bar-members';
import type { BarMember } from '@coaster/common';
import { BarRole } from '@coaster/common';
import { asBarMemberId } from '@coaster/core';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, failed, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('MemberTools');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createMemberTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  return {
    listMembers: tool({
      description:
        'List the staff of the bar with their user UUID, name, email and role. Use it to resolve a worker name into a UUID before scheduling shifts, or to answer "¿quién trabaja aquí?".',
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'listMembers' called`);
        return runner.query<BarMember[]>('bar:view-members', new GetMembersQuery(context.barId), (members) =>
          members.map((member) => ({
            memberId: member.id,
            userId: member.userId,
            name: member.userName,
            email: member.userEmail,
            role: member.role,
            active: member.active,
          })),
        );
      },
    }),

    inviteMember: tool({
      description:
        'Invite somebody to join the bar staff by email. Destructive: it sends a real email, so it requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          email: z.string().describe('Email address of the person to invite.'),
          role: z
            .enum([BarRole.MANAGER, BarRole.STAFF])
            .describe('Role to grant: MANAGER can manage the menu and shifts, STAFF only works the floor.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the invite in a previous turn.'),
        }),
      ),
      execute: async ({
        email,
        role,
        confirmed,
      }: {
        email: string;
        role: BarRole;
        confirmed: boolean;
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'inviteMember' called with role="${role}", confirmed=${confirmed}`);

        if (!EMAIL.test(email)) {
          return failed('That does not look like a valid email address. Ask the user to spell it out.');
        }

        return runner.execute('bar:invite-member', new InviteMemberCommand(context.barId, email, context.user, role), {
          confirmed,
          summary: `send an invitation email to ${email} as ${role}`,
        });
      },
    }),

    removeMember: tool({
      description:
        'Remove a member from the bar staff, revoking their access. Destructive: requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          memberId: z
            .string()
            .describe('The bar member UUID (memberId, not userId) to remove. Use listMembers to find it.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the removal in a previous turn.'),
        }),
      ),
      execute: async ({ memberId, confirmed }: { memberId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'removeMember' called with memberId="${memberId}", confirmed=${confirmed}`);
        return runner.execute('bar:remove-member', new RemoveMemberCommand(context.barId, asBarMemberId(memberId)), {
          confirmed,
          summary: 'remove that member from the bar staff, revoking their access',
        });
      },
    }),
  };
};
