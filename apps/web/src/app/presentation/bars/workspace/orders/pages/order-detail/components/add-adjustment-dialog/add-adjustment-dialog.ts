import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatButton as MatBtn } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AdjustmentType } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NumberInput } from '../../../../../../../components/number-input/number-input';

export interface AddAdjustmentResult {
  type: AdjustmentType;
  value: number; // For percentage 0-100, for fixed amount in cents
  reason?: string;
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
    FormsModule,
    NumberInput,
    MatFormField,
    MatLabel,
    MatInput,
  ],
  template: `
    <h2 mat-dialog-title>Añadir Descuento / Ajuste</h2>

    <mat-dialog-content class="flex flex-col gap-4 !pt-2">
      
      <div class="flex justify-center mb-2">
        <mat-button-toggle-group [value]="type()" (change)="type.set($event.value)" class="w-full">
          <mat-button-toggle class="w-1/2" [value]="AdjustmentType.FIXED_AMOUNT">Fijo (€)</mat-button-toggle>
          <mat-button-toggle class="w-1/2" [value]="AdjustmentType.PERCENTAGE">Porcentaje (%)</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <div class="flex items-center gap-4 w-full">
        @if (type() === AdjustmentType.FIXED_AMOUNT) {
          <coaster-number-input
            [value]="(valueCents() || 0) / 100"
            (valueChange)="updateFromEuros($event)"
            [min]="0"
            [step]="0.50"
            wrapperClass="w-full"
          />
          <span class="text-xl font-bold text-on-surface w-8">€</span>
        } @else {
          <coaster-number-input
            [value]="valuePercentage() || 0"
            (valueChange)="valuePercentage.set($event)"
            [min]="0"
            [max]="100"
            [step]="5"
            wrapperClass="w-full"
          />
          <span class="text-xl font-bold text-on-surface w-8">%</span>
        }
      </div>

      <div class="w-full mt-2">
        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
          <mat-label>Motivo (opcional)</mat-label>
          <input matInput [ngModel]="reason()" (ngModelChange)="reason.set($event)" placeholder="Ej. Invitación" />
        </mat-form-field>
      </div>
      
    </mat-dialog-content>

    <mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
      <button mat-button (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" (click)="onConfirm()" [disabled]="!isValid()">
        Aplicar
      </button>
    </mat-dialog-actions>
  `,
  host: {
    class: 'block',
  },
})
export class AddAdjustmentDialog {
  protected readonly AdjustmentType = AdjustmentType;
  
  public readonly type = signal<AdjustmentType>(AdjustmentType.FIXED_AMOUNT);
  public readonly valueCents = signal<number>(0);
  public readonly valuePercentage = signal<number>(0);
  public readonly reason = signal<string>('');

  public readonly confirmed = output<AddAdjustmentResult>();
  public readonly canceled = output<void>();

  updateFromEuros(euros: number) {
    this.valueCents.set(Math.round(euros * 100));
  }

  isValid() {
    if (this.type() === AdjustmentType.FIXED_AMOUNT) {
      return this.valueCents() > 0;
    } else {
      return this.valuePercentage() > 0 && this.valuePercentage() <= 100;
    }
  }

  onConfirm() {
    this.confirmed.emit({
      type: this.type(),
      value: this.type() === AdjustmentType.FIXED_AMOUNT ? this.valueCents() : this.valuePercentage(),
      reason: this.reason() || undefined,
    });
  }
}
