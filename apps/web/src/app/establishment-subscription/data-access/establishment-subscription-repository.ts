import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  EstablishmentId,
  CreateCheckoutSessionDto,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionDto,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class EstablishmentSubscriptionRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    getSubscription: (establishmentId: EstablishmentId) =>
      `/establishments/${establishmentId}/establishment-subscription`,
    createCheckoutSession: (establishmentId: EstablishmentId) =>
      `/establishments/${establishmentId}/establishment-subscription/checkout-session`,
    createCustomerPortalSession: (establishmentId: EstablishmentId) =>
      `/establishments/${establishmentId}/establishment-subscription/customer-portal-session`,
  };

  public async createCheckoutSession(
    establishmentId: EstablishmentId,
    dto: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    return await firstValueFrom(
      this.#http.post<CreateCheckoutSessionResponse>(this.routes.createCheckoutSession(establishmentId), dto),
    );
  }

  public async createCustomerPortalSession(
    establishmentId: EstablishmentId,
    dto: CreateCustomerPortalSessionDto,
  ): Promise<CreateCustomerPortalSessionResponse> {
    return await firstValueFrom(
      this.#http.post<CreateCustomerPortalSessionResponse>(
        this.routes.createCustomerPortalSession(establishmentId),
        dto,
      ),
    );
  }
}
