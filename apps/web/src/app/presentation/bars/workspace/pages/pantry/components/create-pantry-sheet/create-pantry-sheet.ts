import { Component, inject, input, output, signal } from '@angular/core';
import { MatChipListbox, MatChipListboxChange, MatChipOption } from '@angular/material/chips';
import { Category } from '@coaster/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CreateCategoryForm } from '../create-category-form/create-category-form';
import { CreateProductForm } from '../create-product-form/create-product-form';

type PantryTabs = 'PRODUCT' | 'CATEGORY';

@Component({
  selector: 'coaster-create-pantry-sheet',
  imports: [MatChipListbox, MatChipOption, TranslatePipe, CreateProductForm, CreateCategoryForm],
  template: `
    <div class="flex flex-col px-6 pb-6 pt-2">
      <div class="mb-4">
        <mat-chip-listbox #tabListbox [value]="currentTab()" (change)="onTabChange($event, tabListbox)">
          @for (tab of availableTabs(); track tab.id) {
            <mat-chip-option [value]="tab.id" [selectable]="true">
              {{ tab.label | translate }}
            </mat-chip-option>
          }
        </mat-chip-listbox>
      </div>

      @switch (currentTab()) {
        @case ('PRODUCT') {
          <coaster-create-product-form
            [categories]="categories()"
            (created)="created.emit()"
            (canceled)="canceled.emit()"
          />
        }
        @case ('CATEGORY') {
          <coaster-create-category-form (canceled)="canceled.emit()" (created)="created.emit()" />
        }
      }
    </div>
  `,
})
export class CreatePantrySheet {
  public readonly categories = input.required<Category[]>();

  public readonly canceled = output<void>();
  public readonly created = output<void>();

  readonly #translate = inject(TranslateService);

  readonly currentTab = signal<PantryTabs>('PRODUCT');
  readonly availableTabs = signal<{ id: PantryTabs; label: string }[]>([
    { id: 'PRODUCT', label: this.#translate.instant('pantry.product') },
    { id: 'CATEGORY', label: this.#translate.instant('pantry.category') },
  ]);

  onTabChange(event: MatChipListboxChange, listbox: MatChipListbox) {
    const value = event.value;
    if (value === undefined || value === null) {
      listbox.value = this.currentTab();
    } else {
      this.currentTab.set(value);
    }
  }
}
