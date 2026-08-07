import { BarSubscriptionMapper } from '@coaster/bar-subscription';
import type { AdminBarDetail } from '@coaster/common';
import { AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { daysAgo } from '../../utils/pagination';
import { GetAdminBarDetailQuery } from '../impl/get-admin-bar-detail.query';

const RECENT_ACTIVITY_SIZE = 10;

@QueryHandler(GetAdminBarDetailQuery)
export class GetAdminBarDetailHandler implements IQueryHandler<GetAdminBarDetailQuery, AdminBarDetail> {
  constructor(
    private readonly _readRepo: AdminBarReadRepository,
    private readonly _auditRepo: AdminAuditRepository,
  ) {}

  async execute(query: GetAdminBarDetailQuery): Promise<AdminBarDetail> {
    const bar = await this._readRepo.findBarById(query.barId);

    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    const [members, counters, recentActivity] = await Promise.all([
      this._readRepo.findMembers(query.barId),
      this._readRepo.countersFor(query.barId, daysAgo(30)),
      this._auditRepo.findRecentForTarget(AdminAuditTargetType.BAR, query.barId, RECENT_ACTIVITY_SIZE),
    ]);

    const grantedById = bar.billing?.manualGrantedById;
    const grantor = grantedById ? await this._readRepo.findGrantorName(grantedById) : null;

    return {
      bar: AdminMapper.toBarSummary(bar),
      subscription: bar.billing
        ? BarSubscriptionMapper.toAdminDomain({ ...bar.billing, manualGrantedByName: grantor?.name ?? null })
        : BarSubscriptionMapper.toAdminFreeDefault(query.barId),
      members: members.map((member) => AdminMapper.toBarMember(member)),
      counters,
      recentActivity: recentActivity.map((entry) => AdminMapper.toAuditEntry(entry)),
    };
  }
}
