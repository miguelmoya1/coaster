import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-create-table-form',
  imports: [MatButton, MatFormField, MatLabel, MatInput, TranslatePipe],
  template: `
    <div class="flex flex-col gap-4 px-2 pb-4 pt-2">
      <h3 class="text-lg font-bold text-on-surface">{{ 'orders.create_table' | translate }}</h3>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>{{ 'orders.table_name_placeholder' | translate }}</mat-label>
        <input matInput #tableNameInput type="text" />
      </mat-form-field>
      <button mat-flat-button class="w-full" [disabled]="isSubmitting()" (click)="submit(tableNameInput.value)">
        {{ 'common.create' | translate }}
      </button>
    </div>
  `,
})
export class CreateTableForm {
  public readonly isSubmitting = input<boolean>(false);
  public readonly created = output<string>();

  submit(name: string) {
    if (!name.trim()) {
      return;
    }

    this.created.emit(name.trim());
  }
}
