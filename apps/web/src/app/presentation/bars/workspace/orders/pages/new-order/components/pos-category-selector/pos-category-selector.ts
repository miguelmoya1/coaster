import { Component, computed, inject, input, model } from '@angular/core';
import { MatChipListbox, MatChipListboxChange, MatChipOption } from '@angular/material/chips';
import type { Category } from '@coaster/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'coaster-pos-category-selector',
  imports: [TranslatePipe, MatChipListbox, MatChipOption],
  template: `
    <mat-chip-listbox
      #chipListbox
      [value]="selectedCategory()"
      (change)="onCategoryChange($event, chipListbox)"
      class="hide-scrollbar"
    >
      @for (category of categoryTabs(); track category.id) {
        <mat-chip-option [value]="category.id" [selectable]="true">
          {{ category.label | translate }}
        </mat-chip-option>
      }
    </mat-chip-listbox>
  `,
})
export class PosCategorySelector {
  readonly categories = input.required<Category[]>();
  readonly selectedCategory = model<string>('ALL');

  readonly categoryTabs = computed(() => {
    const rawCategories = this.categories() ?? [];
    return [
      { id: 'ALL', label: this.#translate.instant('orders.all_categories') },
      ...rawCategories.map((c) => ({ id: c.id as string, label: c.name })),
    ];
  });

  readonly #translate = inject(TranslateService);

  onCategoryChange(event: MatChipListboxChange, listbox: MatChipListbox) {
    const value = event.value;
    if (value === undefined || value === null) {
      listbox.value = this.selectedCategory();
    } else {
      this.selectedCategory.set(value);
    }
  }
}
