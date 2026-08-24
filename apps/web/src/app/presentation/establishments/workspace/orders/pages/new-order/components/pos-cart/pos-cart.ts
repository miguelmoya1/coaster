import { Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TableStatus, type EstablishmentId, type Table } from '@coaster/common';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  notes?: string;
}

@Component({
  selector: 'coaster-pos-cart',
  imports: [MatIcon, TranslatePipe, MatButton, MatIconButton, PricePipe, RequireSubscriptionDirective],
  template: `
    @if (expanded() && items().length > 0) {
      <div class="flex flex-col gap-2 border-b border-outline-variant/20 pb-3 mb-2">
        <div class="flex flex-col gap-1.5 max-h-[42vh] overflow-y-auto hide-scrollbar">
          @for (item of items(); track item.productId) {
            <div class="bg-surface-container rounded-xl px-3 py-2 flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-on-surface text-sm truncate">{{ item.productName }}</p>
                  <p class="text-xs text-on-surface-variant">{{ item.price * item.quantity | price }}</p>
                </div>

                <button
                  mat-icon-button
                  data-testid="item-notes-btn"
                  [attr.aria-label]="'orders.item_notes' | translate"
                  (click)="toggleNoteEditor(item.productId)"
                >
                  <mat-icon
                    class="text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!"
                    [class.text-primary]="!!item.notes"
                  >
                    sticky_note_2
                  </mat-icon>
                </button>

                <div class="flex items-center gap-1 shrink-0">
                  <button mat-icon-button (click)="decrementClicked.emit(item.productId)">
                    @if (item.quantity === 1) {
                      <mat-icon class="text-error text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0!">
                        delete
                      </mat-icon>
                    } @else {
                      <mat-icon class="text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0!">remove</mat-icon>
                    }
                  </button>
                  <span class="w-6 text-center font-bold text-sm">{{ item.quantity }}</span>
                  <button mat-icon-button (click)="incrementClicked.emit(item.productId)">
                    <mat-icon class="text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0!">add</mat-icon>
                  </button>
                </div>
              </div>

              @if (editingNotesFor() === item.productId) {
                <input
                  #noteInput
                  type="text"
                  data-testid="item-notes-input"
                  class="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 rounded-lg px-3 py-1.5 text-xs border-none outline-none focus:ring-2 focus:ring-primary/20"
                  [value]="item.notes || ''"
                  [placeholder]="'orders.item_notes_placeholder' | translate"
                  (input)="onItemNotesChange(item.productId, $event)"
                  (blur)="editingNotesFor.set(undefined)"
                  (keydown.enter)="editingNotesFor.set(undefined)"
                />
              } @else if (item.notes) {
                <p class="text-xs text-primary/90 truncate">{{ item.notes }}</p>
              }
            </div>
          }
        </div>

        <div class="flex items-center gap-2">
          @if (showsTableSelect()) {
            <select
              class="flex-1 min-w-0 rounded-xl bg-surface-container-highest text-on-surface px-3 py-2.5 text-sm font-medium border border-outline-variant/30 outline-none focus:border-primary"
              [value]="selectedTableId() ?? ''"
              (change)="onTableChange($event)"
            >
              <option value="">{{ 'orders.no_table' | translate }}</option>
              @for (table of freeTables(); track table.id) {
                <option [value]="table.id">{{ table.name }}</option>
              }
            </select>
          }

          <button
            type="button"
            data-testid="order-notes-btn"
            class="flex items-center gap-1.5 shrink-0 rounded-xl bg-surface-container-highest px-3 py-2.5 text-sm font-medium border border-outline-variant/30 cursor-pointer"
            [class.text-primary]="!!orderNotes()"
            [class.border-primary]="!!orderNotes()"
            (click)="orderNotesOpen.set(!orderNotesOpen())"
          >
            <mat-icon class="text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">sticky_note_2</mat-icon>
            {{ 'orders.order_notes' | translate }}
          </button>
        </div>

        @if (orderNotesOpen()) {
          <textarea
            data-testid="order-notes-input"
            class="w-full bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 rounded-xl px-3 py-2 text-sm resize-none h-16 border-none outline-none focus:ring-2 focus:ring-primary/20"
            [value]="orderNotes() || ''"
            [placeholder]="'orders.order_notes_placeholder' | translate"
            (change)="onOrderNotesChange($event)"
          ></textarea>
        }

        @if (orderNotes() && !orderNotesOpen()) {
          <p class="text-xs text-primary/90 px-1 truncate">{{ orderNotes() }}</p>
        }
      </div>
    }

    @if (items().length === 0) {
      <p class="text-center text-sm text-on-surface-variant py-2">{{ 'orders.empty_cart' | translate }}</p>
    } @else {
      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="cart-toggle"
          class="flex flex-1 min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left cursor-pointer"
          (click)="expanded.set(!expanded())"
        >
          <mat-icon class="text-on-surface-variant text-[20px]! w-[20px]! h-[20px]! leading-[20px]! m-0!">
            {{ expanded() ? 'expand_more' : 'expand_less' }}
          </mat-icon>
          <span class="text-sm font-semibold text-on-surface-variant whitespace-nowrap">
            {{ totalUnits() }} {{ 'orders.items' | translate }}
          </span>
          <span class="flex-1 text-right text-xl font-black text-primary truncate">{{ totalCents() | price }}</span>
        </button>

        <button
          data-testid="submit-order-btn"
          mat-flat-button
          coasterRequireSubscription
          [establishmentId]="establishmentId()"
          class="shrink-0"
          [disabled]="disabled()"
          (click)="submitClicked.emit()"
        >
          <mat-icon class="text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">send</mat-icon>
          {{ 'orders.send_order' | translate }}
        </button>
      </div>
    }
  `,
})
export class PosCart {
  readonly establishmentId = input.required<EstablishmentId>();
  readonly items = input.required<CartItem[]>();
  readonly tables = input<Table[]>([]);
  readonly selectedTableId = input<string | undefined>(undefined);
  readonly tableLocked = input(false);
  readonly disabled = input(false);

  readonly incrementClicked = output<string>();
  readonly decrementClicked = output<string>();
  readonly tableSelected = output<string | undefined>();
  readonly itemNotesChanged = output<{ productId: string; notes: string }>();
  readonly orderNotesChanged = output<string>();
  readonly submitClicked = output<void>();

  readonly orderNotes = input<string>('');

  readonly expanded = signal(false);
  readonly editingNotesFor = signal<string | undefined>(undefined);
  readonly orderNotesOpen = signal(false);

  protected readonly noteInput = viewChild<ElementRef<HTMLInputElement>>('noteInput');

  readonly freeTables = computed(() => this.tables().filter((t) => t.status === TableStatus.FREE));

  readonly showsTableSelect = computed(() => this.tables().length > 0 && !this.tableLocked());

  readonly totalUnits = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));

  readonly totalCents = computed(() => this.items().reduce((sum, item) => sum + item.price * item.quantity, 0));

  constructor() {
    effect(() => {
      if (this.items().length === 0) {
        this.expanded.set(false);
        this.editingNotesFor.set(undefined);
      }
    });

    effect(() => this.noteInput()?.nativeElement.focus());
  }

  protected toggleNoteEditor(productId: string) {
    this.editingNotesFor.update((current) => (current === productId ? undefined : productId));
  }

  protected onTableChange(event: Event) {
    const target = event.target as HTMLSelectElement | null;
    this.tableSelected.emit(target?.value || undefined);
  }

  protected onItemNotesChange(productId: string, event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.itemNotesChanged.emit({ productId, notes: target?.value || '' });
  }

  protected onOrderNotesChange(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    this.orderNotesChanged.emit(target?.value || '');
  }
}
