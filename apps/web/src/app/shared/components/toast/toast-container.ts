import { Component, inject } from '@angular/core';
import { Toast } from '../../../core/services/toast';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-toast-container',
  imports: [NgClass, TranslatePipe],
  template: `
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          animate.enter="toast-enter"
          animate.leave="toast-leave"
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md min-w-[280px]"
          [ngClass]="{
            'bg-green-500/90 border-green-400/50 text-white': toast.type === 'success',
            'bg-red-500/90 border-red-400/50 text-white': toast.type === 'error',
            'bg-slate-800/90 border-slate-700/50 text-white': toast.type === 'info'
          }"
        >
          <span class="flex-1 text-sm font-medium">{{ toast.message | translate }}</span>
          <button 
            (click)="toastService.remove(toast.id)"
            class="text-white/70 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    @keyframes toastEnter {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes toastLeave {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0.95);
      }
    }
    .toast-enter {
      animation: toastEnter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .toast-leave {
      animation: toastLeave 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `
})
export class ToastContainer {
  public toastService = inject(Toast);
}
