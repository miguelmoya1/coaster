import { Component, output, signal } from '@angular/core';
import { form, FormField, FormRoot, max, min, required } from '@angular/forms/signals';
import { MatButton as MatBtn } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { AdjustmentType } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../../../../../components/field/field';
import { CoasterInput } from '../../../../../../../components/field/input.directive';
import { NumberInput } from '../../../../../../../components/number-input/number-input';

export interface AddAdjustmentResult {
  type: AdjustmentType;
  value: number;
  reason?: string;
}

interface AddAdjustmentFormValue {
  type: AdjustmentType;
  amount: number;
  percentage: number;
  reason: string;
}

@Component({
  selector: 'coaster-add-adjustment-dialog',
  imports: [
    MatBtn,
    MatButtonToggle,
    MatButtonToggleGroup,
    TranslatePipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    FormRoot,
    FormField,
    NumberInput,
    Field,
    CoasterInput,
  ],
  template: `
    <form [formRoot]="form">
      <h2 mat-dialog-title>Añadir Descuento / Ajuste</h2>

      <mat-dialog-content class="flex flex-col gap-4 !pt-2">
        <div class="flex justify-center mb-2">
          <mat-button-toggle-group
            [value]="form.type().value()"
            (change)="form.type().value.set($event.value)"
            class="w-full"
          >
            <mat-button-toggle class="w-1/2" [value]="AdjustmentType.FIXED_AMOUNT">Fijo (€)</mat-button-toggle>
            <mat-button-toggle class="w-1/2" [value]="AdjustmentType.PERCENTAGE">Porcentaje (%)</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <div class="flex items-center gap-4 w-full">
          @if (form.type().value() === AdjustmentType.FIXED_AMOUNT) {
            <coaster-number-input [formField]="form.amount" [step]="0.5" wrapperClass="w-full" />
            <span class="text-xl font-bold text-on-surface w-8">€</span>
          } @else {
            <coaster-number-input [formField]="form.percentage" [step]="5" wrapperClass="w-full" />
            <span class="text-xl font-bold text-on-surface w-8">%</span>
          }
        </div>

        <div class="w-full mt-2">
          <coaster-field label="Motivo (opcional)">
            <input coasterInput enterkeyhint="send" [formField]="form.reason" placeholder="Ej. Invitación" />
          </coaster-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
        <button mat-button type="button" (click)="canceled.emit()">
          {{ 'common.cancel' | translate }}
        </button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form().submitting()">Aplicar</button>
      </mat-dialog-actions>
    </form>
  `,
  host: {
    class: 'block',
  },
})
export class AddAdjustmentDialog {
  protected readonly AdjustmentType = AdjustmentType;

  public readonly confirmed = output<AddAdjustmentResult>();
  public readonly canceled = output<void>();

  readonly #formBase = signal<AddAdjustmentFormValue>({
    type: AdjustmentType.FIXED_AMOUNT,
    amount: 0,
    percentage: 0,
    reason: '',
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.type);
      min(fields.amount, 0.01, {
        when: (ctx) => ctx.valueOf(fields.type) === AdjustmentType.FIXED_AMOUNT,
      });
      min(fields.percentage, 1, {
        when: (ctx) => ctx.valueOf(fields.type) === AdjustmentType.PERCENTAGE,
      });
      max(fields.percentage, 100, {
        when: (ctx) => ctx.valueOf(fields.type) === AdjustmentType.PERCENTAGE,
      });
    },
    {
      submission: {
        action: async (form) => {
          const { type, amount, percentage, reason } = form().value();

          this.confirmed.emit({
            type,
            value: type === AdjustmentType.FIXED_AMOUNT ? Math.round(amount * 100) : percentage,
            reason: reason.trim() || undefined,
          });

          return null;
        },
      },
    },
  );
}
