import { Component, computed, input, model, output } from '@angular/core';
import { MatChipListbox, MatChipListboxChange, MatChipOption, MatChipTrailingIcon } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import type { Category } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AVAILABLE_ICONS } from '../icon-picker/icon-picker';

@Component({
  selector: 'coaster-category-filter',
  imports: [TranslatePipe, MatChipListbox, MatChipOption, MatIcon, MatChipTrailingIcon],
  template: `
    <mat-chip-listbox
      #chipListbox
      [value]="selectedCategoryId()"
      (change)="onCategoryChange($event, chipListbox)"
      class="hide-scrollbar"
    >
      @for (category of tabs(); track category.id) {
        <mat-chip-option [value]="category.id" [selectable]="true" data-testid="category-chip">
          <div class="flex items-center gap-1.5">
            @if (category.icon && isAvailableIcon(category.icon)) {
              <mat-icon fontSet="material-symbols-outlined" class="text-[18px] w-[18px] h-[18px]">
                {{ category.icon }}
              </mat-icon>
            } @else if (category.id !== 'ALL' && category.label) {
               <div class="w-[18px] h-[18px] rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center text-[9px] font-bold">
                 {{ getInitials(category.label | translate) }}
               </div>
            }
            <span class="text-sm font-medium" data-testid="category-name">{{ category.label | translate }}</span>
          </div>
          
          @if (editable() && category.id !== 'ALL') {
            <button
              matChipTrailingIcon
              (click)="onEditClick($event, category.id)"
              class="flex items-center justify-center ml-1 shrink-0"
              aria-label="Editar categoría"
            >
              <mat-icon class="text-[14px] w-3.5 h-3.5 flex items-center justify-center">edit</mat-icon>
            </button>
          }
        </mat-chip-option>
      }
    </mat-chip-listbox>
  `,
})
export class CategoryFilter {
  readonly categories = input.required<Category[]>();
  readonly selectedCategoryId = model<string>('ALL');
  readonly editable = input(false);
  
  readonly editCategoryClicked = output<string>();

  readonly tabs = computed(() => {
    const rawCategories = this.categories() ?? [];
    return [
      { id: 'ALL', label: 'pantry.all', icon: null },
      ...rawCategories.map((c) => ({ id: c.id, label: c.name, icon: c.icon })),
    ];
  });

  isAvailableIcon(icon: string) {
    return AVAILABLE_ICONS.includes(icon);
  }

  getInitials(name: string) {
    return name ? name.substring(0, 2).toUpperCase() : '';
  }

  onCategoryChange(event: MatChipListboxChange, listbox: MatChipListbox) {
    const value = event.value;
    if (value === undefined || value === null) {
      listbox.value = this.selectedCategoryId();
    } else {
      this.selectedCategoryId.set(value);
    }
  }

  onEditClick(event: Event, id: string) {
    event.stopPropagation();
    event.preventDefault();
    this.editCategoryClicked.emit(id);
  }
}
