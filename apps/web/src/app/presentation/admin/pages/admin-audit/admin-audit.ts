import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AdminAuditStore } from '@coaster/admin';
import type { AdminAuditAction } from '@coaster/common';
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
  readonly #store = inject(AdminAuditStore);

  protected readonly entries = this.#store.entries;
  protected readonly total = this.#store.total;
  protected readonly page = this.#store.page;
  protected readonly pageSize = this.#store.pageSize;
  protected readonly totalPages = this.#store.totalPages;
  protected readonly isLoading = this.#store.isLoading;
  protected readonly hasLoaded = this.#store.hasLoaded;
  protected readonly hasFilters = this.#store.hasFilters;
  protected readonly action = this.#store.action;

  protected readonly actionFilters = ACTION_FILTERS;

  protected selectAction(action: AdminAuditAction | undefined) {
    this.#store.setAction(action);
  }

  protected filterLabel(action: AdminAuditAction | undefined): string {
    return action ? `admin.audit_action.${action.toLowerCase()}` : 'admin.audit.filter_all';
  }

  protected clearFilters() {
    this.#store.clearFilters();
  }

  protected goToPage(page: number) {
    this.#store.goToPage(page);
  }

  protected reload() {
    this.#store.reload();
  }
}
