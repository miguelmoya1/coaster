import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  Bar,
  BarId,
  BarSubscription,
  CreateBarDto,
  CreateCheckoutSessionDto,
  CreateCheckoutSessionResponse,
  CreateCustomerPortalSessionDto,
  CreateCustomerPortalSessionResponse,
} from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class BarRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    myBars: '/bars',
    bar: (barId: BarId) => `/bars/${barId}`,
    create: '/bars',
    adminSearch: (query: string) => `/bars/admin/search?q=${query}`,
    getSubscription: (barId: BarId) => `/bars/${barId}/billing/subscription`,
    createCheckoutSession: (barId: BarId) => `/bars/${barId}/billing/checkout-session`,
    createCustomerPortalSession: (barId: BarId) => `/bars/${barId}/billing/customer-portal-session`,
  };

  public async create(createBarDto: CreateBarDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.create, createBarDto));
  }

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
