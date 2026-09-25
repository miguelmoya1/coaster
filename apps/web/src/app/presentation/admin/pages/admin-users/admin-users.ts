import { Component, computed, debounced, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_PAGE_SIZE, flagOf, ManagePlatform, oneOf, pageOf, searchOf, totalPagesOf } from '@coaster/admin';
import type { AdminUserSummary, Paginated, Role } from '@coaster/common';
import { Role as UserRole } from '@coaster/common';
import { ActionFeedback, type PageResource } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CoasterInput } from '../../../components/field/input.directive';
import { ConfirmationDialog } from '../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../components/loading/loading';
import { PageHeader } from '../../../components/page-header/page-header';
import { AdminPagination } from '../../components/admin-pagination/admin-pagination';

const ROLE_FILTERS: (Role | undefined)[] = [undefined, UserRole.ADMIN, UserRole.USER];
const ACTIVE_FILTERS: { value: boolean | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: 'admin.users.state_all' },
  { value: true, labelKey: 'admin.users.state_active' },
  { value: false, labelKey: 'admin.users.state_inactive' },
];

@Component({
  selector: 'coaster-admin-users',
  imports: [
    MatIcon,
    MatButton,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    TranslatePipe,
    Loading,
    PageHeader,
    AdminPagination,
    CoasterInput,
  ],
  templateUrl: './admin-users.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminUsers {
  public readonly results = input.required<PageResource<Paginated<AdminUserSummary>>>();
  public readonly q = input<string>();
  public readonly role = input<string>();
  public readonly active = input<string>();
  public readonly page = input<string>();

  readonly #managePlatform = inject(ManagePlatform);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #confirm = inject(ConfirmationDialog);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);

  readonly #loaded = computed(() => {
    const results = this.results();
    return results.hasValue() ? results.value() : undefined;
  });

  protected readonly searchQuery = linkedSignal(() => this.q() ?? '');
  readonly #typed = debounced(this.searchQuery, 400);

  protected readonly users = computed(() => this.#loaded()?.items ?? []);
  protected readonly total = computed(() => this.#loaded()?.total ?? 0);
  protected readonly currentPage = computed(() => pageOf(this.page()));
  protected readonly pageSize = ADMIN_PAGE_SIZE.users;
  protected readonly totalPages = computed(() => totalPagesOf(this.total(), this.pageSize));
  protected readonly isLoading = computed(() => this.results().isLoading() || this.#typed.status() === 'loading');
  protected readonly hasLoaded = computed(() => this.results().hasValue());
  protected readonly isSaving = signal(false);
  protected readonly selectedRole = computed(() => oneOf(Object.values(UserRole), this.role()));
  protected readonly selectedActive = computed(() => flagOf(this.active()));
  protected readonly hasFilters = computed(
    () =>
      Boolean(searchOf(this.searchQuery())) || this.selectedRole() !== undefined || this.selectedActive() !== undefined,
  );

  constructor() {
    effect(() => {
      const typed = searchOf(this.#typed.value());

      if (typed !== searchOf(untracked(this.q))) {
        untracked(() => this.#query({ q: typed ?? null, page: null }));
      }
    });
  }

  protected readonly roleFilters = ROLE_FILTERS;
  protected readonly activeFilters = ACTIVE_FILTERS;
  protected readonly adminRole = UserRole.ADMIN;

  protected onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected selectRole(role: Role | undefined) {
    this.#query({ role: role ?? null, page: null });
  }

  protected selectActive(active: boolean | undefined) {
    this.#query({ active: active === undefined ? null : String(active), page: null });
  }

  protected filterLabel(role: Role | undefined): string {
    return role ? `admin.user_role.${role.toLowerCase()}` : 'admin.users.filter_all';
  }

  protected clearFilters() {
    this.searchQuery.set('');
    this.#query({ q: null, role: null, active: null, page: null });
  }

  protected goToPage(page: number) {
    this.#query({ page: Math.min(Math.max(1, page), this.totalPages()) });
  }

  protected async toggleAdmin(user: AdminUserSummary) {
    const promoting = user.role !== UserRole.ADMIN;

    const confirmed = await this.#confirm.confirm({
      title: this.#translate.instant(promoting ? 'admin.users.promote_title' : 'admin.users.demote_title'),
      text: this.#translate.instant(promoting ? 'admin.users.promote_text' : 'admin.users.demote_text', {
        name: user.name,
        email: user.email,
      }),
      confirmLabel: promoting ? 'admin.users.promote_confirm' : 'admin.users.demote_confirm',
    });

    if (!confirmed) {
      return;
    }

    await this.#update(user, { role: promoting ? UserRole.ADMIN : UserRole.USER });
  }

  protected async toggleActive(user: AdminUserSummary) {
    await this.#update(user, { active: !user.active });
  }

  async #update(user: AdminUserSummary, changes: { role?: Role; active?: boolean }) {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    try {
      await this.#managePlatform.updateUser(user.id, changes);
      this.results().reload();
      this.#feedback.success(this.#translate.instant('admin.users.update_success'));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  #query(queryParams: Record<string, string | number | null>) {
    void this.#router.navigate([], { relativeTo: this.#route, queryParams, queryParamsHandling: 'merge' });
  }
}
