import { Component, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { NumberInput } from '../../../../../../../components/number-input/number-input';

@Component({
  selector: 'coaster-update-tip-dialog',
  imports: [MatButton, TranslatePipe, MatDialogTitle, MatDialogContent, MatDialogActions, FormsModule, NumberInput],
  template: `
    <h2 mat-dialog-title>Añadir Propina</h2>

    <mat-dialog-content class="flex flex-col gap-4 !pt-2">
      <p class="text-sm text-on-surface-variant mb-2">
        Introduce la cantidad de propina a añadir al pedido.
      </p>

      <div class="flex flex-wrap gap-2 justify-center mb-2">
        <button mat-button class="!rounded-full" (click)="setTipCents(100)">+ 1,00 €</button>
        <button mat-button class="!rounded-full" (click)="setTipCents(200)">+ 2,00 €</button>
        <button mat-button class="!rounded-full" (click)="setTipCents(500)">+ 5,00 €</button>
        <button mat-button class="!rounded-full" color="warn" (click)="setTipCents(0)">0,00 €</button>
      </div>

      <div class="flex items-center gap-4 w-full">
        <coaster-number-input
          [value]="(tipCents() || 0) / 100"
          (valueChange)="updateFromInput($event)"
          [min]="0"
          [step]="0.50"
          wrapperClass="w-full"
        />
        <span class="text-xl font-bold text-on-surface">€</span>
      </div>
      
    </mat-dialog-content>

    <mat-dialog-actions class="flex justify-end gap-3 mt-4 p-0 border-none">
      <button mat-button (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>
      <button mat-flat-button color="primary" (click)="onConfirm()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  host: {
    class: 'block',
  },
})
export class UpdateTipDialog implements OnInit {
  public readonly currentTipAmount = input.required<number>();
  
  public readonly tipCents = signal<number>(0);

  public readonly confirmed = output<number>();
  public readonly canceled = output<void>();

  ngOnInit() {
    this.tipCents.set(this.currentTipAmount() || 0);
  }

  setTipCents(cents: number) {
    this.tipCents.set(cents);
  }

  updateFromInput(euros: number) {
    this.tipCents.set(Math.round(euros * 100));
  }

  onConfirm() {
    this.confirmed.emit(this.tipCents());
  }
}
