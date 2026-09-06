import { Component, model } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterInput } from '../../../../../../../components/field/input.directive';

@Component({
  selector: 'coaster-pos-search',
  imports: [TranslatePipe, MatIconButton, MatIcon, CoasterInput],
  template: `
    <div class="relative w-full">
      <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">search</mat-icon>
      <input
        coasterInput
        type="text"
        enterkeyhint="search"
        class="pl-10 pr-10"
        [value]="query()"
        (input)="onSearchInput($event)"
        [placeholder]="'orders.search_placeholder' | translate"
      />
      @if (query()) {
        <button mat-icon-button (click)="query.set('')" class="absolute! right-3 top-1/2 -translate-y-1/2">
          <mat-icon class="text-lg">close</mat-icon>
        </button>
      }
    </div>
  `,
})
export class PosSearch {
  readonly query = model<string>('');

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }
}
