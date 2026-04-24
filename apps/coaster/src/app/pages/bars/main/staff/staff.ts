import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, InviteBarMemberDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentUser, handleErrorFormField } from '../../../../core';
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
  protected readonly totalMembers = computed(() => this.list.value()?.length ?? 0);

  protected readonly members = computed(() => {
    if (!this.list.hasValue()) return [];
    return this.list.value();
  });
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
    this.#router.navigate(['/bars', this.barId(), 'staff']);
  }

  readonly inviteMemberSubmit = async (payload: InviteBarMemberDto) => {
    this.isSubmitting.set(true);

    try {
      await this.#inviteMember.invite(this.barId(), payload);
    } catch (error: unknown) {
      return handleErrorFormField(error);
    } finally {
      this.#barMembers.reload();
      this.closeModal();
      this.isSubmitting.set(false);
    }

    return null;
  };
}
