import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { BarId, CreateBarDto } from '@coaster/common';
import { BarPermission, BarRole } from '@coaster/common';
import { hasPermission } from '@coaster/core';
import { memberMapper } from '@coaster/members';
import { BarRepository } from '../data-access/bar-repository';
import { barArrayMapper, barMapper } from '../mappers/bar.mapper';
import { CreateBar } from '../services/create-bar';
import { CurrentBar } from '../services/current-bar';
import { MyBars } from '../services/my-bars';
import { MyMember } from '../services/my-member';

@Service()
export class BarsStore {
  readonly #createBar = inject(CreateBar);
  readonly #myBars = inject(MyBars);
  readonly #barRepository = inject(BarRepository);
  readonly #currentBar = inject(CurrentBar);
  readonly #myMember = inject(MyMember);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #myBarsResource = httpResource(() => this.#myBars.execute(), {
    parse: (bars) => barArrayMapper(bars),
  });

  readonly #currentBarResource = httpResource(() => this.#currentBar.execute(this.#currentBarId()), {
    parse: (bar) => barMapper(bar),
  });

  readonly #myMemberResource = httpResource(() => this.#myMember.execute(this.#currentBarId()), {
    parse: (member) => memberMapper(member),
  });

  readonly #subscription = signal<{
    status: 'idle' | 'loading' | 'error' | 'ready';
    value?: Awaited<ReturnType<BarRepository['getSubscription']>>;
  }>({
    status: 'idle',
    value: undefined,
  });

  public readonly list = this.#myBarsResource.asReadonly();
  public readonly current = this.#currentBarResource.asReadonly();
  public readonly currentId = this.#currentBarId.asReadonly();
  public readonly myMember = this.#myMemberResource.asReadonly();
  public readonly subscription = this.#subscription.asReadonly();

  public readonly isOwner = computed(() => {
    if (!this.myMember.hasValue()) {
      return false;
    }
    const member = this.myMember.value();
    return member?.role === BarRole.OWNER;
  });

  public hasPermission(permission: BarPermission): boolean {
    if (!this.myMember.hasValue()) {
      return false;
    }
    const member = this.myMember.value();
    return member ? hasPermission(member.role, permission) : false;
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadCurrentBar() {
    this.#currentBarResource.reload();
    this.#myMemberResource.reload();
    void this.#loadSubscription();
  }

  public reloadMyBars() {
    this.#myBarsResource.reload();
  }

  public async create(createBarDto: CreateBarDto) {
    await this.#createBar.execute(createBarDto);
    this.reloadMyBars();
  }

  public async createCustomerPortalSession(returnUrl: string): Promise<string | undefined> {
    const barId = this.#currentBarId();

    if (!barId) {
      return undefined;
    }

    const { url } = await this.#barRepository.createCustomerPortalSession(barId, { returnUrl });
    return url;
  }

  public async createCheckoutSession(returnUrl: string): Promise<string | undefined> {
    const barId = this.#currentBarId();

    if (!barId) {
      return undefined;
    }

    const currentPath = window.location.pathname + window.location.search;
    const { url } = await this.#barRepository.createCheckoutSession(barId, {
      plan: 'PRO_MONTHLY',
      successUrl: returnUrl,
      cancelUrl: window.location.origin + currentPath,
    });

    return url;
  }

  readonly #subscriptionLoader = effect(() => {
    void this.#loadSubscription();
  });

  async #loadSubscription(): Promise<void> {
    const barId = this.#currentBarId();

    if (!barId) {
      this.#subscription.set({ status: 'idle', value: undefined });
      return;
    }

    this.#subscription.set({ status: 'loading', value: this.#subscription().value });

    try {
      const subscription = await this.#barRepository.getSubscription(barId);
      this.#subscription.set({ status: 'ready', value: subscription });
    } catch {
      this.#subscription.set({ status: 'error', value: undefined });
    }
  }
}
