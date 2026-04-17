import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { BarId, InviteBarMemberDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError, CurrentUser, prepareDefaultProfileImage } from '../../../../core';
import { BarMembers, InviteMember, InviteMemberForm, StaffMemberCard } from '../../../../members';
import { BottomSheet, Fab, Loading, SectionTitle } from '../../../../shared';

@Component({
  selector: 'coaster-staff',
  imports: [Loading, StaffMemberCard, SectionTitle, BottomSheet, Fab, InviteMemberForm, TranslatePipe],
  host: {
    class: 'flex flex-col gap-2',
  },
  template: `
    <coaster-section-title
      [heading]="'members.staff.title' | translate"
      [description]="'members.staff.description' | translate: { count: totalMembers() }"
      class="mb-8"
    />

    @if (list.isLoading()) {
      <coaster-loading />
    }

    @if (list.hasValue()) {
      @for (member of list.value(); track member.id) {
        <coaster-staff-member-card
          [staffName]="member.userName"
          [staffEmail]="member.userEmail"
          [staffImage]="getProfileImage(member.userImage, member.userName)"
          [roleName]="member.role"
        />
      }
    }

    @if (currentUserRole() === 'OWNER') {
      <coaster-fab (click)="openBottomSheet()" />
    }

    @if (isSheetOpen()) {
      <coaster-bottom-sheet (closed)="isSheetOpen.set(false)">
        <coaster-invite-member-form
          (inviteMember)="inviteMember($event)"
          [disabled]="list.isLoading() || isSubmitting()"
          [(error)]="formError"
          (canceled)="isSheetOpen.set(false)"
        />
      </coaster-bottom-sheet>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Staff {
  public readonly barId = input.required<BarId>();

  readonly #barMembers = inject(BarMembers);
  readonly #inviteMember = inject(InviteMember);
  readonly #currentUser = inject(CurrentUser);

  protected readonly list = this.#barMembers.list;

  protected readonly isSheetOpen = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | undefined>(undefined);
  protected readonly totalMembers = computed(() => this.list.value()?.length ?? 0);
  protected readonly currentUserRole = computed(() => {
    const barMember = this.#barMembers.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
    return barMember?.role;
  });

  constructor() {
    effect(() => {
      this.#barMembers.setBarContext(this.barId());
    });
  }

  protected openBottomSheet() {
    this.formError.set(undefined);
    this.isSheetOpen.set(true);
  }

  protected async inviteMember(payload: InviteBarMemberDto) {
    await this.#handleFormSubmission(
      async () => {
        await this.#inviteMember.invite(this.barId(), payload);
      },
      () => {
        this.#barMembers.reload();
        this.isSheetOpen.set(false);
      },
    );
  }

  protected getProfileImage(profileImage: string, userName: string) {
    return prepareDefaultProfileImage(profileImage, userName);
  }

  async #handleFormSubmission(action: () => Promise<void>, onSuccess: () => void) {
    this.formError.set(undefined);
    try {
      this.isSubmitting.set(true);
      await action();
      onSuccess();
    } catch (error: unknown) {
      this.formError.set(error instanceof ApiError ? error.message : 'UNEXPECTED_ERROR');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
