import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { EstablishmentRole } from '@coaster/common';
import type { EstablishmentRole as EstablishmentRoleType } from '@coaster/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-staff-member-card',
  imports: [TranslatePipe, MatButton, MatIconButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger],
  template: `
    <div class="flex items-center w-full min-w-0">
      <div
        class="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-surface-container-highest"
      >
        @if (staffImage() && !imageFailed()) {
          <img [src]="staffImage()" (error)="onImageError()" class="w-full h-full object-cover" alt="Staff Member" />
        } @else {
          <div
            class="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-black text-lg"
          >
            {{ staffInitials() }}
          </div>
        }
      </div>

      <div class="grow min-w-0 ml-3 sm:ml-4 flex flex-col gap-0.5">
        <h3 class="heading-3 truncate text-base font-bold text-on-surface">
          {{ staffName() }}
        </h3>
        <p class="text-on-surface-variant text-[0.8rem] font-medium truncate">
          {{ 'common.role.' + roleName().toLowerCase() | translate }}
        </p>
      </div>
    </div>

    @if (showActions()) {
      <div
        class="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4 justify-end w-full sm:w-auto pt-3 sm:pt-0 border-t border-outline-variant/10 sm:border-t-0 shrink-0"
      >
        @if (!isCurrentUser()) {
          <a
            [attr.href]="disabled() ? null : 'mailto:' + staffEmail()"
            target="_blank"
            rel="noopener noreferrer"
            [class]="
              'w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-colors cursor-pointer shrink-0 ' +
              (disabled()
                ? 'pointer-events-none opacity-50 bg-surface-container-high text-on-surface-variant'
                : 'bg-surface-bright text-primary hover:bg-surface-container-highest')
            "
          >
            <mat-icon class="text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">mail</mat-icon>
          </a>
        }

        @if (canChangeRole()) {
          <button
            mat-icon-button
            [matMenuTriggerFor]="roleMenu"
            [disabled]="disabled()"
            [attr.aria-label]="'members.change_role' | translate"
            [title]="'members.change_role' | translate"
            (click)="$event.stopPropagation()"
          >
            <mat-icon class="text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">manage_accounts</mat-icon>
          </button>

          <mat-menu #roleMenu="matMenu">
            @for (role of assignableRoles; track role) {
              <button
                mat-menu-item
                type="button"
                [disabled]="role === roleName() || (isOnlyOwner() && roleName() === ownerRole)"
                (click)="roleChanged.emit(role)"
              >
                @if (role === roleName()) {
                  <mat-icon>check</mat-icon>
                }
                <span>{{ 'common.role.' + role.toLowerCase() | translate }}</span>
              </button>
            }
          </mat-menu>
        }

        @if (showDeleteButton()) {
          @if (isCurrentUser()) {
            <button
              mat-stroked-button
              class="warn"
              [disabled]="disabled() || isOnlyOwner()"
              [title]="isOnlyOwner() ? ('members.leave_tooltip' | translate) : ''"
              class="shrink-0"
              (click)="onDeleteClick($event)"
            >
              {{ 'members.leave' | translate }}
            </button>
          } @else {
            <button mat-icon-button class="warn" [disabled]="disabled()" (click)="onDeleteClick($event)">
              <mat-icon class="text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">delete</mat-icon>
            </button>
          }
        }
      </div>
    }
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class]':
      "'rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center relative overflow-hidden transition-all border border-outline-variant/15 bg-surface-container hover:bg-surface-bright'",
  },
})
export class StaffMemberCard {
  readonly staffName = input.required<string>();
  readonly staffImage = input.required<string>();
  readonly staffEmail = input.required<string>();
  readonly roleName = input.required<string>();
  readonly disabled = input(false);
  readonly showDeleteButton = input(false);
  readonly isCurrentUser = input(false);
  readonly isOnlyOwner = input(false);
  readonly canChangeRole = input(false);
  readonly deleteClicked = output<void>();
  readonly roleChanged = output<EstablishmentRoleType>();

  protected readonly assignableRoles = Object.values(EstablishmentRole);
  protected readonly ownerRole = EstablishmentRole.OWNER;

  readonly imageFailed = linkedSignal(() => {
    this.staffImage();
    return false;
  });

  readonly staffInitials = computed(() => {
    const name = this.staffName() || '';
    const parts = name.split(' ').filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, Math.min(name.length, 2)).toUpperCase();
  });

  readonly showActions = computed(() => !this.isCurrentUser() || this.showDeleteButton() || this.canChangeRole());

  onImageError(): void {
    this.imageFailed.set(true);
  }

  onDeleteClick(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }
}
