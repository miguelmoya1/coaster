import { Component } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideLock, lucideMail, lucidePlus, lucideWine } from '@ng-icons/lucide';
import { CategoryTabs } from '../../categories';
import { ExchangeRequestCard } from '../../exchanges';
import { StaffMemberCard } from '../../members';
import { InventoryItemCard } from '../../products';
import { AvatarBadge } from '../../shared';
import {
  BottomNav,
  BottomSheet,
  Button,
  Fab,
  MultiSelectInput,
  NumberInput,
  SectionTitle,
  SelectInput,
  StatusCard,
  TextareaInput,
  TextInput,
  TopAppBar,
  ToggleInput,
} from '../../shared';
import { HorizontalDateScroller, ShiftCard } from '../../shifts';

@Component({
  selector: 'coaster-dev-sandbox',
  imports: [
    ExchangeRequestCard,
    StaffMemberCard,
    AvatarBadge,
    TopAppBar,
    Button,
    Fab,
    SectionTitle,
    StatusCard,
    BottomNav,
    ShiftCard,
    BottomSheet,
    HorizontalDateScroller,
    InventoryItemCard,
    CategoryTabs,
    TextInput,
    NumberInput,
    TextareaInput,
    ToggleInput,
    SelectInput,
    MultiSelectInput,
  ],
  providers: [
    provideIcons({
      lucideCheck,
      lucidePlus,
      lucideWine,
      lucideMail,
      lucideLock,
    }),
  ],
  template: `
    <div class="mt-24"></div>
    <div class="bg-surface pb-24 min-h-screen text-on-surface font-sans">
      <coaster-top-app-bar [label]="'Dev Sandbox'" [image]="'https://i.pravatar.cc/150?img=11'" />

      <div class="p-6 flex flex-col gap-10">
        <!-- Form Controls -->
        <section class="flex flex-col gap-4">
          <coaster-section-title
            heading="Form Controls (Signal Forms)"
            description="A collection of reusable input controls integrated natively with Angular's Signal Forms."
          />

          <div class="flex flex-col gap-6">
            <coaster-text-input
              label="Email Address"
              placeholder="Enter your email..."
              icon="lucideMail"
              hint="We will never share your email with anyone else."
            />

            <coaster-text-input label="Password" type="password" placeholder="Enter password..." icon="lucideLock" />

            <coaster-number-input
              label="Storage Quantity"
              [showControls]="true"
              [step]="1"
              hint="Adjust the number of items in stock"
            />

            <coaster-textarea-input
              label="Order Notes"
              placeholder="Any special requests? (e.g. Allergy info)"
              [rows]="4"
            />

            <div class="bg-surface-container/50 p-4 rounded-xl border border-outline-variant">
              <coaster-toggle-input
                label="Enable Push Notifications"
                hint="You will receive alerts when inventory is low"
              />
            </div>

            <coaster-select-input
              label="User Role"
              placeholder="Select role..."
              hint="Pick the main role for this user"
              [options]="[
                { value: 'admin', label: 'Administrator' },
                { value: 'manager', label: 'Bar Manager' },
                { value: 'staff', label: 'Regular Staff' },
                { value: 'banned', label: 'Banned User', disabled: true },
              ]"
            />

            <coaster-multi-select-input
              label="Assigned Venues"
              placeholder="Select venues to grant access..."
              hint="You can select multiple venues"
              [options]="[
                { value: 'v1', label: 'Downtown Lounge' },
                { value: 'v2', label: 'Rooftop Bar' },
                { value: 'v3', label: 'Underground Club' },
              ]"
            />
          </div>
        </section>

        <!-- Shared components -->
        <section class="flex flex-col gap-4">
          <coaster-section-title
            heading="Shared Components"
            description="Common UI elements like buttons, badges, and cards used across the entire application workspace."
          />
          <div class="flex flex-wrap gap-6 items-center">
            <coaster-avatar-badge imageSrc="https://i.pravatar.cc/150?img=12" altText="Avatar" />
            <coaster-button icon="lucideCheck" customClass="w-auto px-6">Primary Button</coaster-button>
            <coaster-fab icon="lucidePlus" />
          </div>

          <coaster-status-card status="success" classes="w-full">
            <h3 class="font-bold text-on-surface text-lg">Status Card (Success)</h3>
            <p class="text-on-surface-variant">This is a success status card displaying normal operation.</p>
          </coaster-status-card>

          <coaster-status-card status="error" classes="w-full">
            <h3 class="font-bold text-on-surface text-lg">Status Card (Error)</h3>
            <p class="text-on-surface-variant">This is an error status card for alerts.</p>
          </coaster-status-card>
        </section>

        <!-- Categories -->
        <section class="flex flex-col gap-4">
          <coaster-section-title heading="Categories Components" />
          <coaster-category-tabs
            [tabs]="[
              { id: '1', label: 'All' },
              { id: '2', label: 'Drinks' },
              { id: '3', label: 'Food' },
              { id: '4', label: 'Merch' },
            ]"
            selectedTabId="2"
          />
        </section>

        <!-- Shifts -->
        <section class="flex flex-col gap-4">
          <coaster-section-title heading="Shifts Components" />
          <coaster-horizontal-date-scroller
            [days]="[
              { dayName: 'MON', dayNumber: 20, isActive: false },
              { dayName: 'TUE', dayNumber: 21, isActive: true },
              { dayName: 'WED', dayNumber: 22, isActive: false },
              { dayName: 'THU', dayNumber: 23, isActive: false },
            ]"
          />

          <coaster-shift-card
            staffName="Alice Wonderland"
            staffImage="https://i.pravatar.cc/150?img=5"
            timeRange="08:00 - 16:00"
            roleName="Bartender"
            roleColorClass="text-primary bg-primary"
          />
        </section>

        <!-- Members -->
        <section class="flex flex-col gap-4">
          <coaster-section-title heading="Members Components" />
          <coaster-staff-member-card
            staffName="Bob Builder"
            staffImage="https://i.pravatar.cc/150?img=8"
            staffEmail="[EMAIL_ADDRESS]"
            roleName="Security"
            [isOffDuty]="false"
          />

          <coaster-staff-member-card
            staffName="Charlie Chaplin"
            staffImage="https://i.pravatar.cc/150?img=9"
            staffEmail="[EMAIL_ADDRESS]"
            roleName="Waiter"
            [isOffDuty]="true"
          />
        </section>

        <!-- Products -->
        <section class="flex flex-col gap-4">
          <coaster-section-title heading="Products Components" />
          <coaster-inventory-item-card
            itemName="Craft Beer IPA"
            locationText="Main Fridge"
            [qty]="42"
            icon="lucideWine"
            statusLevel="good"
          />
        </section>

        <!-- Exchanges -->
        <section class="flex flex-col gap-4">
          <coaster-section-title heading="Exchanges Components" />
          <coaster-exchange-request-card
            month="APR"
            day="15"
            shiftPeriod="Night Shift"
            roleName="Manager"
            timeRange="22:00 - 06:00"
            offeredBy="David"
          />
        </section>

        <!-- Bottom Sheet standalone test -->
        <section class="flex flex-col gap-4">
          <coaster-section-title heading="Bottom Sheet (Inline Test)" />
          <div class="relative h-64 border border-outline border-dashed rounded-xl overflow-hidden">
            <coaster-bottom-sheet>
              <h3 class="text-xl font-bold mb-2">Acciones Disponibles</h3>
              <p class="text-on-surface-variant text-sm mb-6">
                Selecciona una de las siguientes opciones para continuar con la gestión de este turno.
              </p>

              <div class="flex flex-col gap-3">
                <coaster-button icon="lucideCheck" customClass="w-full">Confirmar Asignación</coaster-button>
              </div>
            </coaster-bottom-sheet>
          </div>
        </section>
      </div>

      <coaster-bottom-nav [barId]="'1'" />
    </div>
  `,
})
export default class DevSandbox {}
