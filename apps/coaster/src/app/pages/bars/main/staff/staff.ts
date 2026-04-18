import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, InviteBarMemberDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError, CurrentUser, prepareDefaultProfileImage } from '../../../../core';
import { BarMembers, InviteMember, InviteMemberForm, StaffMemberCard } from '../../../../members';
import { BottomSheet, Fab, Loading, SectionTitle } from '../../../../shared';

@Component({
  selector: 'coaster-staff',
  imports: [Loading, StaffMemberCard, SectionTitle, BottomSheet, Fab, InviteMemberForm, TranslatePipe, RouterLink],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './staff.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Staff {
  public readonly barId = input.required<BarId>();

  readonly #barMembers = inject(BarMembers);
  readonly #inviteMember = inject(InviteMember);
  readonly #currentUser = inject(CurrentUser);

  protected readonly list = this.#barMembers.list;

  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  protected readonly isInviteMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['invite']),
    this.#router,
  );
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

  protected closeModal() {
    this.formError.set(undefined);
    this.#router.navigate(['/bars', this.barId(), 'staff']);
  }

  protected async inviteMember(payload: InviteBarMemberDto) {
    await this.#handleFormSubmission(
      async () => {
        await this.#inviteMember.invite(this.barId(), payload);
      },
      () => {
        this.#barMembers.reload();
        this.closeModal();
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
