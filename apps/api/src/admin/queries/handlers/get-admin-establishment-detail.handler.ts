import { EstablishmentSettingsMapper, EstablishmentSettingsRepository } from '@coaster/establishments';
import { EstablishmentSubscriptionMapper } from '@coaster/establishment-subscription';
import type { AdminEstablishmentDetail } from '@coaster/common';
import { AdminAuditTargetType, DEFAULT_ESTABLISHMENT_MODULES, ErrorCodes, resolveModules } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminEstablishmentReadRepository } from '../../data-access/admin-establishment.read.repository';
import { AdminMapper } from '../../mappers/admin.mapper';
import { daysAgo } from '../../utils/pagination';
import { GetAdminEstablishmentDetailQuery } from '../impl/get-admin-establishment-detail.query';

const RECENT_ACTIVITY_SIZE = 10;

@QueryHandler(GetAdminEstablishmentDetailQuery)
export class GetAdminEstablishmentDetailHandler implements IQueryHandler<
  GetAdminEstablishmentDetailQuery,
  AdminEstablishmentDetail
> {
  constructor(
    private readonly _readRepo: AdminEstablishmentReadRepository,
    private readonly _auditRepo: AdminAuditRepository,
    private readonly _settingsRepo: EstablishmentSettingsRepository,
  ) {}

  async execute(query: GetAdminEstablishmentDetailQuery): Promise<AdminEstablishmentDetail> {
    const establishment = await this._readRepo.findEstablishmentById(query.establishmentId);

    if (!establishment) {
      throw new NotFoundException(ErrorCodes.ESTABLISHMENT_NOT_FOUND);
    }

    const [members, counters, recentActivity, settings] = await Promise.all([
      this._readRepo.findMembers(query.establishmentId),
      this._readRepo.countersFor(query.establishmentId, daysAgo(30)),
      this._auditRepo.findRecentForTarget(
        AdminAuditTargetType.ESTABLISHMENT,
        query.establishmentId,
        RECENT_ACTIVITY_SIZE,
      ),
      this._settingsRepo.find(query.establishmentId),
    ]);

    const grantedById = establishment.billing?.manualGrantedById;
    const grantor = grantedById ? await this._readRepo.findGrantorName(grantedById) : null;

    return {
      establishment: AdminMapper.toEstablishmentSummary(establishment),
      settings: settings
        ? EstablishmentSettingsMapper.toDto(settings)
        : {
            establishmentId: query.establishmentId,
            modules: resolveModules(DEFAULT_ESTABLISHMENT_MODULES),
            configuredAt: null,
          },
      subscription: establishment.billing
        ? EstablishmentSubscriptionMapper.toAdminDomain({
            ...establishment.billing,
            manualGrantedByName: grantor?.name ?? null,
          })
        : EstablishmentSubscriptionMapper.toAdminFreeDefault(query.establishmentId),
      members: members.map((member) => AdminMapper.toEstablishmentMember(member)),
      counters,
      recentActivity: recentActivity.map((entry) => AdminMapper.toAuditEntry(entry)),
    };
  }
}
