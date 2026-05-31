import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'coaster-dialog',
  styles: [
    `
      dialog {
        opacity: 0;
        transform: scale(0.95);
        transition:
          opacity 0.2s ease-out,
          transform 0.2s ease-out,
          display 0.2s ease-out allow-discrete,
          overlay 0.2s ease-out allow-discrete;
      }
      dialog[open] {
        opacity: 1;
        transform: scale(1);
      }
      @starting-style {
        dialog[open] {
          opacity: 0;
          transform: scale(0.95);
        }
      }

      dialog::backdrop {
        background-color: rgb(0 0 0 / 0%);
        backdrop-filter: blur(0px);
        transition:
          display 0.2s allow-discrete,
          overlay 0.2s allow-discrete,
          background-color 0.2s,
          backdrop-filter 0.2s;
      }

      dialog[open]::backdrop {
        background-color: rgb(0 0 0 / 40%);
        backdrop-filter: blur(2px);
      }

      @starting-style {
        dialog[open]::backdrop {
          background-color: rgb(0 0 0 / 0%);
          backdrop-filter: blur(0px);
        }
      }
    `,
  ],
  template: `
    <dialog
      #dialog
      tabindex="-1"
      class="bg-transparent p-0 m-auto"
      (click)="onBackdropClick($event)"
      (keydown.enter)="onBackdropClick($event)"
      (keydown.space)="onBackdropClick($event)"
      (close)="onDialogClose()"
    >
      <ng-content />
    </dialog>
  `,
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent {
  public readonly allowBackdropClick = input(false, { transform: booleanAttribute });
  public readonly isOpen = input.required<boolean>();
  public readonly closed = output<void>();

  protected readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef();
      if (!dialog?.nativeElement) {
        return;
      }

      if (this.isOpen()) {
        if (typeof dialog.nativeElement.showModal === 'function') {
          dialog.nativeElement.showModal();
        } else {
          dialog.nativeElement.setAttribute('open', '');
        }
      } else {
        if (typeof dialog.nativeElement.close === 'function') {
          dialog.nativeElement.close();
        } else {
          dialog.nativeElement.removeAttribute('open');
          dialog.nativeElement.dispatchEvent(new Event('close'));
        }
      }
    });
  }

  protected onBackdropClick(event: Event) {
    if (!this.allowBackdropClick()) {
      return;
    }

    if (event.target === this.dialogRef()?.nativeElement) {
      this.closed.emit();
    }
  }

  protected onDialogClose() {
    this.closed.emit();
  }
}
