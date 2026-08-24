import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../../../../../components/field/field';
import { CoasterInput } from '../../../../../../../components/field/input.directive';

@Component({
  selector: 'coaster-create-table-form',
  imports: [MatButton, Field, CoasterInput, TranslatePipe],
  template: `
    <div class="flex flex-col gap-4 px-2 pb-4 pt-2">
      <h3 class="text-lg font-bold text-on-surface">{{ 'orders.create_table' | translate }}</h3>
      <coaster-field [label]="'orders.table_name_placeholder' | translate">
        <input coasterInput #tableNameInput type="text" />
      </coaster-field>
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
