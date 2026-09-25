import { inject, Service } from '@angular/core';
import type {
  AddBetaTesterDto,
  BetaTesterId,
  EstablishmentId,
  EstablishmentMemberId,
  EstablishmentModule,
  EstablishmentRole,
  GrantEstablishmentPlanDto,
  RevokeEstablishmentPlanDto,
  UpdateAdminUserDto,
  UserId,
} from '@coaster/common';
import { ManageMembers } from '@coaster/establishment-members';
import { AdminRepository } from '../data-access/admin-repository';

@Service()
export class ManagePlatform {
  readonly #repository = inject(AdminRepository);
  readonly #manageMembers = inject(ManageMembers);

  public grantPlan(establishmentId: EstablishmentId, dto: GrantEstablishmentPlanDto): Promise<void> {
    return this.#repository.grantEstablishmentPlan(establishmentId, dto);
  }

  public revokePlan(establishmentId: EstablishmentId, dto: RevokeEstablishmentPlanDto): Promise<void> {
    return this.#repository.revokeEstablishmentPlan(establishmentId, dto);
  }

  public rename(establishmentId: EstablishmentId, name: string): Promise<void> {
    return this.#repository.renameEstablishment(establishmentId, { name });
  }

  public async updateModules(establishmentId: EstablishmentId, modules: EstablishmentModule[]): Promise<void> {
    await this.#repository.updateEstablishmentModules(establishmentId, { modules });
  }

  public updateMemberRole(
    establishmentId: EstablishmentId,
    memberId: EstablishmentMemberId,
    role: EstablishmentRole,
  ): Promise<void> {
    return this.#manageMembers.updateRole(establishmentId, memberId, role);
  }

  public updateUser(userId: UserId, dto: UpdateAdminUserDto): Promise<void> {
    return this.#repository.updateUser(userId, dto);
  }

  public addBetaTester(dto: AddBetaTesterDto): Promise<void> {
    return this.#repository.addBetaTester(dto);
  }

  public removeBetaTester(betaTesterId: BetaTesterId): Promise<void> {
    return this.#repository.removeBetaTester(betaTesterId);
  }
}
