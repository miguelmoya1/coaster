import { Service, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

@Service()
export class Toast {
  readonly #toasts = signal<ToastMessage[]>([]);
  readonly toasts = this.#toasts.asReadonly();

  public show(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, message, type, duration };
    
    this.#toasts.update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  public success(message: string, duration = 3000) {
    this.show(message, 'success', duration);
  }

  public error(message: string, duration = 5000) {
    this.show(message, 'error', duration);
  }

  public remove(id: string) {
    this.#toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }
}
