import { CdkDrag, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';

@Component({
  selector: 'coaster-bottom-sheet',
  imports: [CdkDrag],
  styles: [
    `
      .cdk-drag-resizer {
        transform: none !important;
      }
    `,
  ],
  template: `
    <div
      class="fixed inset-0 z-100 bg-black/40 transition-opacity duration-300 backdrop-blur-[2px]"
      [class.opacity-0]="!isOpen()"
      [class.pointer-events-none]="!isOpen()"
      (click)="close()"
      (keydown.escape)="close()"
      (keydown.enter)="close()"
      tabindex="0"
      role="button"
      aria-label="Close bottom sheet"
    ></div>

    <div
      class="fixed inset-x-0 bottom-0 z-101 flex justify-center pointer-events-none transition-transform duration-300 ease-in-out"
      [style.transform]="isOpen() ? 'translateY(0)' : 'translateY(100%)'"
    >
      <div
        class="w-full max-w-md bg-surface-container-highest rounded-t-[32px] shadow-nav pointer-events-auto flex flex-col border-t border-outline-variant/20 overflow-hidden"
        [class.transition-all]="!isDragging()"
        [class.duration-300]="!isDragging()"
        [style.height.px]="sheetHeight()"
      >
        <div
          cdkDrag
          cdkDragLockAxis="y"
          (cdkDragStarted)="onDragStarted()"
          (cdkDragMoved)="onDragMoved($event)"
          (cdkDragEnded)="onDragEnded($event)"
          class="cdk-drag-resizer w-full pt-4 pb-4 flex justify-center shrink-0 cursor-ns-resize touch-none"
        >
          <div class="w-12 h-1.5 bg-outline rounded-full opacity-40"></div>
        </div>

        <div class="px-6 pb-8 overflow-y-auto flex-1 h-full">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheet {
  public readonly closed = output<void>();

  protected readonly isOpen = signal(true);
  protected readonly isDragging = signal(false);
  protected readonly platformId = inject(PLATFORM_ID);

  protected minHeight = 200;
  protected maxHeight = 600;
  protected readonly sheetHeight = signal(200);


  #initialHeight = 0;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.maxHeight = Math.min(window.innerHeight * 0.9, 600);
      this.sheetHeight.set((this.minHeight + this.maxHeight) / 2);
    }
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  open() {
    this.isOpen.set(true);
    this.sheetHeight.set((this.minHeight + this.maxHeight) / 2);
  }

  onDragStarted() {
    this.isDragging.set(true);
    this.#initialHeight = this.sheetHeight();
  }

  onDragMoved(event: CdkDragMove) {
    let newHeight = this.#initialHeight - event.distance.y;

    if (newHeight < this.minHeight - 20) newHeight = this.minHeight - 20;
    if (newHeight > this.maxHeight + 20) newHeight = this.maxHeight + 20;

    this.sheetHeight.set(newHeight);
  }

  onDragEnded(event: CdkDragEnd) {
    this.isDragging.set(false);

    const current = this.sheetHeight();
    const midPoint = (this.minHeight + this.maxHeight) / 2;

    if (current <= this.minHeight + 30 && event.distance.y > 40) {
      this.close();
      setTimeout(() => this.sheetHeight.set(midPoint), 300);
    } else {
      const snapPoints = [this.minHeight, midPoint, this.maxHeight];
      const closest = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - current) < Math.abs(prev - current) ? curr : prev,
      );
      this.sheetHeight.set(closest);
    }

    event.source.reset();
  }
}
