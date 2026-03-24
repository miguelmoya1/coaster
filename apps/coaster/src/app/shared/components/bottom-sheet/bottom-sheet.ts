import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'coaster-bottom-sheet',
  template: `
    <div class="absolute inset-x-0 bottom-0 z-50 flex justify-center pb-safe pointer-events-none">
      <div class="w-full max-w-md bg-surface-container-highest rounded-t-[32px] shadow-nav pointer-events-auto flex flex-col transition-transform duration-300 border-t border-outline-variant/20">
        <!-- Drag Handle -->
        <div class="w-full pt-4 pb-2 flex justify-center shrink-0">
          <div class="w-12 h-1.5 bg-outline rounded-full opacity-40"></div>
        </div>
        
        <!-- Content -->
        <div class="px-6 pb-8 pt-4 overflow-y-auto max-h-[80vh]">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomSheet {
}
