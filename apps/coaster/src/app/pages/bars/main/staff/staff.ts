import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { BarId, InviteBarMemberDto } from '@coaster/interfaces';
import {
  BarMembers,
  InviteMember,
  InviteMemberForm,
  StaffMemberCard,
} from '../../../../members';
import { TranslatePipe } from '@ngx-translate/core';
import { BottomSheet, Fab, Loading, SectionTitle } from '../../../../shared';

@Component({
  selector: 'coaster-staff',
  imports: [
    Loading,
    StaffMemberCard,
    SectionTitle,
    BottomSheet,
    Fab,
    InviteMemberForm,
    TranslatePipe,
  ],
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
          [staffImage]="
            member.userImage ||
            'https://ui-avatars.com/api/?name=' + member.userName
          "
          [roleName]="member.role"
        />
      }
    }

    <coaster-fab (click)="openBottomSheet()" />

    @defer (when isSheetOpen()) {
      @if (isSheetOpen()) {
        <coaster-bottom-sheet (closed)="isSheetOpen.set(false)">
          <coaster-invite-member-form (inviteMember)="inviteMember($event)" />
        </coaster-bottom-sheet>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Staff {
  public readonly barId = input.required<BarId>();
  readonly #barMembers = inject(BarMembers);
  readonly #inviteMember = inject(InviteMember);

  protected readonly isSheetOpen = signal(false);
  protected readonly list = this.#barMembers.list;

  protected async inviteMember(payload: InviteBarMemberDto) {
    await this.#inviteMember.invite(this.barId(), payload);
    this.#barMembers.reload();
    this.isSheetOpen.set(false);
  }

  protected readonly totalMembers = computed(
    () => this.list.value()?.length ?? 0,
  );

  constructor() {
    effect(() => {
      this.#barMembers.selectBar(this.barId());
    });
  }

  protected openBottomSheet() {
    this.isSheetOpen.set(true);
  }
}
