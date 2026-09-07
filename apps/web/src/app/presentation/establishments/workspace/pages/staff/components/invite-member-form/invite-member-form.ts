import { Component, computed, inject, output, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import type { EstablishmentRole as EstablishmentRoleType, InviteEstablishmentMemberDto } from '@coaster/common';
import { EstablishmentPermission, EstablishmentRole } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';
import { MembersStore, MyMemberStore } from '@coaster/establishment-members';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../../../../components/field/field';
import { CoasterInput } from '../../../../../../components/field/input.directive';
import { PricePipe } from '../../../../pipes/price/price';

@Component({
  selector: 'coaster-invite-member-form',
  imports: [FormRoot, FormField, MatButton, TranslatePipe, Field, CoasterInput, PricePipe],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-2 mb-6">
        <h2 class="heading-2 m-0 p-0">{{ 'members.invite.title' | translate }}</h2>
        <p class="text-on-surface-variant text-sm m-0 p-0 leading-relaxed">
          {{ 'members.invite.description' | translate }}
        </p>
      </div>

      <coaster-field label="Email">
        <input
          coasterInput
          type="email"
          autocomplete="email"
          enterkeyhint="send"
          [formField]="form.email"
          placeholder="Email"
        />
      </coaster-field>

      <div class="mt-2">
        <coaster-field
          [label]="'members.invite.role_label' | translate"
          [hint]="'members.invite.role_hint_' + selectedRole().toLowerCase() | translate"
        >
          <select coasterInput (change)="selectRole($any($event.target).value)">
            @for (role of assignableRoles; track role) {
              <option [value]="role" [selected]="role === selectedRole()">
                {{ 'common.role.' + role.toLowerCase() | translate }}
              </option>
            }
          </select>
        </coaster-field>
      </div>

      @if (extraSeat(); as seat) {
        <p class="flex items-start gap-2 mt-4 p-3 rounded-2xl bg-primary/5 text-xs text-on-surface-variant">
          <span>
            {{
              'members.invite.extra_seat'
                | translate: { included: seat.included, price: seat.extraPriceCents | price }
            }}
          </span>
        </p>
      }

      @if (form().errors().length > 0) {
        <div class="flex flex-col gap-1 mt-1 ml-1" role="alert">
          @for (error of form().errors(); track error) {
            <span class="text-error text-xs font-medium">{{ error.message || error.kind | translate: error }}</span>
          }
        </div>
      }

      <div class="flex justify-end mt-4 gap-2">
        <button
          mat-stroked-button
          class="w-full"
          type="button"
          [disabled]="form().disabled() || form().submitting()"
          (click)="canceled.emit()"
        >
          {{ 'common.cancel' | translate }}
        </button>

        <button mat-flat-button class="w-full" type="submit" [disabled]="form().disabled() || form().submitting()">
          {{ 'common.invite' | translate }}
        </button>
      </div>
    </form>
  `,
})
export class InviteMemberForm {
  public readonly canceled = output<void>();
  public readonly invited = output<void>();

  readonly #membersStore = inject(MembersStore);
  readonly #subscriptionStore = inject(EstablishmentSubscriptionStore);

  readonly #myMemberStore = inject(MyMemberStore);

  // Un encargado puede invitar pero no facturar, así que el importe no es asunto suyo:
  // lo ve quien lo va a pagar.
  protected readonly extraSeat = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING)
      ? this.#subscriptionStore.extraSeatNotice()
      : undefined,
  );

  protected readonly assignableRoles = Object.values(EstablishmentRole);
  protected readonly selectedRole = signal<EstablishmentRoleType>(EstablishmentRole.STAFF);
  readonly #formBase = signal<InviteEstablishmentMemberDto>({
    email: '',
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.email);
      email(fields.email);
      minLength(fields.email, 3);
      maxLength(fields.email, 255);
    },
    {
      submission: {
        action: async (form) => {
          const payload = { ...form().value(), role: this.selectedRole() };

          try {
            await this.#membersStore.invite(payload);
            this.invited.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected selectRole(role: EstablishmentRoleType) {
    this.selectedRole.set(role);
  }

  protected cancelHandle() {
    this.canceled.emit();
  }
}
