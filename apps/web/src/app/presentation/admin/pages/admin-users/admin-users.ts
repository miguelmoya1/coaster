import { Component, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AdminUsersStore } from '@coaster/admin';
import type { AdminUserSummary, Role } from '@coaster/common';
import { Role as UserRole } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    MatFormField,
    MatLabel,
    MatSuffix,
    MatInput,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    TranslatePipe,
    Loading,
    PageHeader,
    AdminPagination,
  ],
  templateUrl: './admin-users.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminUsers {
  readonly #store = inject(AdminUsersStore);
  readonly #confirm = inject(ConfirmationDialog);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);

  protected readonly users = this.#store.users;
  protected readonly total = this.#store.total;
  protected readonly page = this.#store.page;
  protected readonly pageSize = this.#store.pageSize;
  protected readonly totalPages = this.#store.totalPages;
  protected readonly isLoading = this.#store.isLoading;
  protected readonly hasLoaded = this.#store.hasLoaded;
  protected readonly isSaving = this.#store.isSaving;
  protected readonly hasFilters = this.#store.hasFilters;
  protected readonly searchQuery = this.#store.searchQuery;
  protected readonly role = this.#store.role;
  protected readonly active = this.#store.active;

  protected readonly roleFilters = ROLE_FILTERS;
  protected readonly activeFilters = ACTIVE_FILTERS;
  protected readonly adminRole = UserRole.ADMIN;

  protected onSearch(event: Event) {
    this.#store.setSearchQuery((event.target as HTMLInputElement).value);
  }

  protected selectRole(role: Role | undefined) {
    this.#store.setRole(role);
  }

  protected selectActive(active: boolean | undefined) {
    this.#store.setActive(active);
  }

  protected filterLabel(role: Role | undefined): string {
    return role ? `admin.user_role.${role.toLowerCase()}` : 'admin.users.filter_all';
  }

  protected clearFilters() {
    this.#store.clearFilters();
  }

  protected goToPage(page: number) {
    this.#store.goToPage(page);
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
    try {
      await this.#store.updateUser(user.id, changes);
      this.#feedback.success(this.#translate.instant('admin.users.update_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }
}
