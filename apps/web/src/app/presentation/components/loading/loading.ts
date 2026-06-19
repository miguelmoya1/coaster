import { Component, input } from '@angular/core';

@Component({
  selector: 'coaster-loading',
  template: `
    <div class="flex flex-col items-center justify-center gap-5 w-full h-full p-8" [class]="containerClasses()">
      <div class="relative w-12 h-12 flex items-center justify-center">
        <!-- Fondo suave -->
        <div class="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        <!-- Borde giratorio principal -->
        <div class="absolute inset-0 rounded-full border-4 border-primary border-r-transparent border-t-transparent animate-spin"></div>
        <!-- Resplandor pulsante en el centro -->
        <div class="w-4 h-4 rounded-full bg-primary/40 animate-pulse"></div>
      </div>
      @if (text()) {
        <p [class]="textClasses()">
          {{ text() }}
        </p>
      }
    </div>
  `,
})
export class Loading {
  public readonly text = input<string>();
  public readonly containerClasses = input<string>('min-h-[200px]');
  public readonly textClasses = input<string>(
    'text-on-surface-variant font-medium tracking-wide animate-pulse uppercase text-sm',
  );
}
