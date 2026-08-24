import { Component, effect, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { NumberInput } from '../../../../../../../components/number-input/number-input';

@Component({
  selector: 'coaster-update-tip-dialog',
  imports: [
    MatButton,
    TranslatePipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    FormRoot,
    FormField,
    NumberInput,
  ],
  template: `
    <form [formRoot]="form">
      <h2 mat-dialog-title>Añadir Propina</h2>

      <mat-dialog-content class="flex flex-col gap-4 !pt-2">
        <p class="text-sm text-on-surface-variant mb-2">Introduce la cantidad de propina a añadir al pedido.</p>

        <div class="flex flex-wrap gap-2 justify-center mb-2">
          <button mat-button type="button" class="!rounded-full" (click)="setTip(1)">+ 1,00 €</button>
          <button mat-button type="button" class="!rounded-full" (click)="setTip(2)">+ 2,00 €</button>
          <button mat-button type="button" class="!rounded-full" (click)="setTip(5)">+ 5,00 €</button>
          <button mat-button type="button" class="!rounded-full" color="warn" (click)="setTip(0)">0,00 €</button>
        </div>

        <div class="flex items-center gap-4 w-full">
          <coaster-number-input [formField]="form.tip" [step]="0.5" wrapperClass="w-full" />
          <span class="text-xl font-bold text-on-surface">€</span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
        <button mat-button type="button" (click)="canceled.emit()">
          {{ 'common.cancel' | translate }}
        </button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form().submitting()">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  host: {
    class: 'block',
  },
})
export class UpdateTipDialog {
  public readonly currentTipAmount = input.required<number>();

  public readonly confirmed = output<number>();
  public readonly canceled = output<void>();

  readonly #formBase = signal<{ tip: number }>({ tip: 0 });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.tip);
      min(fields.tip, 0);
    },
    {
      submission: {
        action: async (form) => {
          this.confirmed.emit(Math.round(form().value().tip * 100));
          return null;
        },
      },
    },
  );

  constructor() {
    effect(() => this.#formBase.set({ tip: (this.currentTipAmount() || 0) / 100 }));
  }

  protected setTip(euros: number) {
    this.form.tip().value.set(euros);
  }
}
