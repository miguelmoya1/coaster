import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'coaster-shift-card',
  template: `
    <div class="relative overflow-hidden bg-surface-container-high rounded-2xl p-5 flex items-center justify-between group active:scale-95 transition-all cursor-pointer">
      <div [class]="'absolute left-0 top-0 w-1 h-full ' + roleColorClass()"></div>
      
      <div class="flex flex-col">
        <span class="text-primary font-black text-2xl tracking-tighter uppercase">{{ timeRange() }}</span>
        <span class="text-white font-bold title-lg">{{ staffName() }}</span>
        <div class="flex items-center gap-2 mt-1">
          <span class="label-sm bg-on-primary-container text-white px-2 py-0.5 rounded font-bold uppercase tracking-tighter">{{ roleName() }}</span>
        </div>
      </div>
      
      <div class="w-14 h-14 rounded-xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
        <img [src]="staffImage()" alt="Staff Portrait" class="w-full h-full object-cover" />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftCardComponent {
  readonly staffName = input.required<string>();
  readonly staffImage = input.required<string>();
  readonly timeRange = input.required<string>();
  readonly roleName = input.required<string>();
  readonly roleColorClass = input('text-primary bg-primary');
}
