import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
@Component({
  selector: 'coaster-primary-button',
  imports: [NgIcon],
  template: `
    <button [class]="'w-full h-16 bg-linear-to-br from-primary to-primary-container rounded-xl flex items-center justify-center gap-3 shadow-elevated-primary hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer ' + customClass()">
      <span class="text-on-primary-fixed font-bold uppercase tracking-widest text-sm">
        <ng-content></ng-content>
      </span>
      @if (icon()) {
        <ng-icon [name]="icon()!" class="text-on-primary-fixed text-xl"></ng-icon>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrimaryButtonComponent {
  readonly icon = input<string>();
  readonly customClass = input('');
}
