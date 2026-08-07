import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  BarId,
  CreateCheckoutSessionDto,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionDto,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class BarSubscriptionRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    getSubscription: (barId: BarId) => `/bars/${barId}/bar-subscription`,
    createCheckoutSession: (barId: BarId) => `/bars/${barId}/bar-subscription/checkout-session`,
    createCustomerPortalSession: (barId: BarId) => `/bars/${barId}/bar-subscription/customer-portal-session`,
  };

  public async createCheckoutSession(
    barId: BarId,
    dto: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    return await firstValueFrom(
      this.#http.post<CreateCheckoutSessionResponse>(this.routes.createCheckoutSession(barId), dto),
    );
  }

  public async createCustomerPortalSession(
    barId: BarId,
    dto: CreateCustomerPortalSessionDto,
  ): Promise<CreateCustomerPortalSessionResponse> {
    return await firstValueFrom(
      this.#http.post<CreateCustomerPortalSessionResponse>(this.routes.createCustomerPortalSession(barId), dto),
    );
  }
}
