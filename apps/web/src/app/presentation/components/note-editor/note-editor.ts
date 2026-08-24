import { Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { CoasterInput } from '../field/input.directive';

@Component({
  selector: 'coaster-note-editor',
  imports: [MatIcon, CoasterInput],
  host: { class: 'block' },
  template: `
    @if (editing()) {
      <input
        #field
        coasterInput
        type="text"
        data-testid="note-editor-input"
        class="py-1.5 text-xs"
        enterkeyhint="done"
        [value]="notes()"
        [placeholder]="placeholder()"
        (input)="draft.set($any($event.target).value)"
        (keydown.enter)="commit()"
        (keydown.escape)="cancel()"
        (blur)="commit()"
      />
    } @else if (editable()) {
      <button
        type="button"
        data-testid="note-editor-toggle"
        class="flex w-full items-start gap-1.5 rounded-lg px-1 py-1 text-left text-xs cursor-pointer hover:bg-surface-container-highest"
        [class]="notes() ? 'text-primary/90' : 'text-on-surface-variant'"
        (click)="open()"
      >
        <mat-icon class="text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0! shrink-0 mt-0.5">{{ icon() }}</mat-icon>
        <span class="leading-tight">{{ notes() || placeholder() }}</span>
      </button>
    } @else if (notes()) {
      <p class="flex items-start gap-1.5 px-1 py-1 text-xs text-on-surface-variant">
        <mat-icon class="text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0! shrink-0 mt-0.5">{{ icon() }}</mat-icon>
        <span class="leading-tight">{{ notes() }}</span>
      </p>
    }

    @if (hint() && (editing() || notes())) {
      <span class="block px-1 text-xxs text-on-surface-variant/70">{{ hint() }}</span>
    }
  `,
})
export class NoteEditor {
  readonly notes = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly icon = input<string>('sticky_note_2');
  readonly editable = input(true);

  readonly notesChanged = output<string>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');

  protected readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  readonly #current = computed(() => this.notes() ?? '');

  constructor() {
    effect(() => this.field()?.nativeElement.focus());
  }

  protected open() {
    this.draft.set(this.#current());
    this.editing.set(true);
  }

  protected cancel() {
    this.editing.set(false);
  }

  protected commit() {
    if (!this.editing()) {
      return;
    }

    this.editing.set(false);

    const next = this.draft().trim();
    if (next !== this.#current()) {
      this.notesChanged.emit(next);
    }
  }
}
