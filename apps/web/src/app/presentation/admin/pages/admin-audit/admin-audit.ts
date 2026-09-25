import { Component, computed, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_PAGE_SIZE, oneOf, pageOf, totalPagesOf } from '@coaster/admin';
import type { AdminAuditAction, AdminAuditLogEntry, Paginated } from '@coaster/common';
import type { PageResource } from '@coaster/core';
import { AdminAuditAction as AuditAction } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../components/loading/loading';
import { PageHeader } from '../../../components/page-header/page-header';
import { AdminPagination } from '../../components/admin-pagination/admin-pagination';
import { AuditList } from '../../components/audit-list/audit-list';

const ACTION_FILTERS: (AdminAuditAction | undefined)[] = [undefined, ...Object.values(AuditAction)];

@Component({
  selector: 'coaster-admin-audit',
  imports: [MatIcon, MatButton, TranslatePipe, Loading, PageHeader, AdminPagination, AuditList],
  templateUrl: './admin-audit.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminAudit {
  public readonly audit = input.required<PageResource<Paginated<AdminAuditLogEntry>>>();
  public readonly action = input<string>();
  public readonly page = input<string>();

  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly #loaded = computed(() => {
    const audit = this.audit();
    return audit.hasValue() ? audit.value() : undefined;
  });

  protected readonly entries = computed(() => this.#loaded()?.items ?? []);
  protected readonly total = computed(() => this.#loaded()?.total ?? 0);
  protected readonly currentPage = computed(() => pageOf(this.page()));
  protected readonly pageSize = ADMIN_PAGE_SIZE.audit;
  protected readonly totalPages = computed(() => totalPagesOf(this.total(), this.pageSize));
  protected readonly isLoading = computed(() => this.audit().isLoading());
  protected readonly hasLoaded = computed(() => this.audit().hasValue());
  protected readonly selectedAction = computed(() => oneOf(Object.values(AuditAction), this.action()));
  protected readonly hasFilters = computed(() => this.selectedAction() !== undefined);

  protected readonly actionFilters = ACTION_FILTERS;

  protected selectAction(action: AdminAuditAction | undefined) {
    this.#query({ action: action ?? null, page: null });
  }

  protected filterLabel(action: AdminAuditAction | undefined): string {
    return action ? `admin.audit_action.${action.toLowerCase()}` : 'admin.audit.filter_all';
  }

  protected clearFilters() {
    this.#query({ action: null, page: null });
  }

  protected goToPage(page: number) {
    this.#query({ page: Math.min(Math.max(1, page), this.totalPages()) });
  }

  protected reload() {
    this.audit().reload();
  }

  #query(queryParams: Record<string, string | number | null>) {
    void this.#router.navigate([], { relativeTo: this.#route, queryParams, queryParamsHandling: 'merge' });
  }
}
