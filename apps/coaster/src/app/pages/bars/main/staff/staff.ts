import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { BarMembers, InviteMember, StaffMemberCard } from '../../../../members';
import {
  BottomSheet,
  Loading,
  SectionTitle,
  TextInput,
} from '../../../../shared';

@Component({
  selector: 'coaster-staff',
  imports: [Loading, StaffMemberCard, SectionTitle, BottomSheet, TextInput],
  template: `
    <coaster-section-title
      heading="Staff Roster"
      [description]="totalMembers() + ' team members'"
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
          [staffImage]="
            member.userImage ||
            'https://ui-avatars.com/api/?name=' + member.userName
          "
          [roleName]="member.role"
        />
        <!-- [isOffDuty]="!member.active" -->
      }
    }

    <!-- <coasterb -->

    <coaster-bottom-sheet>
      <coaster-text-input label="Email" placeholder="Enter email..." />
    </coaster-bottom-sheet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Staff {
  public readonly barId = input.required<BarId>();
  readonly #barMembers = inject(BarMembers);
  readonly #inviteMember = inject(InviteMember);

  protected readonly list = this.#barMembers.list;

  protected inviteMember(email: string) {
    this.#inviteMember.invite(this.barId(), { email });
  }

  protected readonly totalMembers = computed(
    () => this.list.value()?.length ?? 0,
  );

  constructor() {
    effect(() => {
      this.#barMembers.selectBar(this.barId());
    });
  }
}
