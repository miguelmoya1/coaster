import type { AdminUserDetail } from '@coaster/common';
import { AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminUserReadRepository } from '../../data-access/admin-user.read.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { GetAdminUserDetailQuery } from '../impl/get-admin-user-detail.query';

const RECENT_ACTIVITY_SIZE = 10;

@QueryHandler(GetAdminUserDetailQuery)
export class GetAdminUserDetailHandler implements IQueryHandler<GetAdminUserDetailQuery, AdminUserDetail> {
  constructor(
    private readonly _readRepo: AdminUserReadRepository,
    private readonly _auditRepo: AdminAuditRepository,
  ) {}

  async execute(query: GetAdminUserDetailQuery): Promise<AdminUserDetail> {
    const user = await this._readRepo.findUserById(query.userId);

    if (!user) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    const [memberships, recentActivity] = await Promise.all([
      this._readRepo.findMemberships(query.userId),
      this._auditRepo.findRecentForTarget(AdminAuditTargetType.USER, query.userId, RECENT_ACTIVITY_SIZE),
    ]);

    return {
      user: AdminMapper.toUserSummary(user),
      establishments: memberships.map((membership) => AdminMapper.toUserEstablishmentMembership(membership)),
      recentActivity: recentActivity.map((entry) => AdminMapper.toAuditEntry(entry)),
    };
  }
}
