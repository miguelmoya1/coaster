import { Component } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideLock,
  lucideMail,
  lucidePlus,
  lucideWine,
} from '@ng-icons/lucide';
import { CategoryTabsComponent } from '../../categories/components/category-tabs/category-tabs.component';
import { ExchangeRequestCardComponent } from '../../exchanges/components/exchange-request-card/exchange-request-card.component';
import { StaffMemberCardComponent } from '../../members/components/staff-member-card/staff-member-card.component';
import { InventoryItemCardComponent } from '../../products/components/inventory-item-card/inventory-item-card.component';
import { AvatarBadgeComponent } from '../../shared/components/avatar-badge/avatar-badge.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { PrimaryButtonComponent } from '../../shared/components/primary-button/primary-button.component';
import { StatusCardComponent } from '../../shared/components/status-card/status-card.component';
import { TopAppBarComponent } from '../../shared/components/top-app-bar/top-app-bar.component';
import {
  MultiSelectInputComponent,
  NumberInputComponent,
  SelectInputComponent,
  TextareaInputComponent,
  TextInputComponent,
  ToggleInputComponent,
} from '../../shared/forms';
import { HorizontalDateScrollerComponent } from '../../shifts/components/horizontal-date-scroller/horizontal-date-scroller.component';
import { ShiftCardComponent } from '../../shifts/components/shift-card/shift-card.component';

@Component({
  selector: 'coaster-dev-sandbox',
  imports: [
    ExchangeRequestCardComponent,
    StaffMemberCardComponent,
    AvatarBadgeComponent,
    TopAppBarComponent,
    PrimaryButtonComponent,
    FabComponent,
    StatusCardComponent,
    BottomNavComponent,
    ShiftCardComponent,
    BottomSheetComponent,
    HorizontalDateScrollerComponent,
    InventoryItemCardComponent,
    CategoryTabsComponent,
    TextInputComponent,
    NumberInputComponent,
    TextareaInputComponent,
    ToggleInputComponent,
    SelectInputComponent,
    MultiSelectInputComponent,
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
      <coaster-top-app-bar
        title="Dev Sandbox"
        userImage="https://i.pravatar.cc/150?img=11"
      ></coaster-top-app-bar>

      <div class="p-6 flex flex-col gap-10">
        <!-- Form Controls -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Form Controls (Signal Forms)
          </h2>

          <div class="flex flex-col gap-6">
            <coaster-text-input
              label="Email Address"
              placeholder="Enter your email..."
              icon="lucideMail"
              hint="We will never share your email with anyone else."
            >
            </coaster-text-input>

            <coaster-text-input
              label="Password"
              type="password"
              placeholder="Enter password..."
              icon="lucideLock"
            >
            </coaster-text-input>

            <coaster-number-input
              label="Storage Quantity"
              [showControls]="true"
              [step]="1"
              hint="Adjust the number of items in stock"
            >
            </coaster-number-input>

            <coaster-textarea-input
              label="Order Notes"
              placeholder="Any special requests? (e.g. Allergy info)"
              [rows]="4"
            >
            </coaster-textarea-input>

            <div
              class="bg-surface-container/50 p-4 rounded-xl border border-outline-variant"
            >
              <coaster-toggle-input
                label="Enable Push Notifications"
                hint="You will receive alerts when inventory is low"
              >
              </coaster-toggle-input>
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
            ></coaster-select-input>

            <coaster-multi-select-input
              label="Assigned Venues"
              placeholder="Select venues to grant access..."
              hint="You can select multiple venues"
              [options]="[
                { value: 'v1', label: 'Downtown Lounge' },
                { value: 'v2', label: 'Rooftop Bar' },
                { value: 'v3', label: 'Underground Club' },
              ]"
            ></coaster-multi-select-input>
          </div>
        </section>

        <!-- Shared components -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Shared Components
          </h2>
          <div class="flex flex-wrap gap-6 items-center">
            <coaster-avatar-badge
              imageSrc="https://i.pravatar.cc/150?img=12"
              altText="Avatar"
            ></coaster-avatar-badge>
            <coaster-primary-button icon="lucideCheck" customClass="w-auto px-6"
              >Primary Button</coaster-primary-button
            >
            <coaster-fab icon="lucidePlus"></coaster-fab>
          </div>

          <coaster-status-card status="success" classes="w-full">
            <h3 class="font-bold text-on-surface text-lg">
              Status Card (Success)
            </h3>
            <p class="text-on-surface-variant">
              This is a success status card displaying normal operation.
            </p>
          </coaster-status-card>

          <coaster-status-card status="error" classes="w-full">
            <h3 class="font-bold text-on-surface text-lg">
              Status Card (Error)
            </h3>
            <p class="text-on-surface-variant">
              This is an error status card for alerts.
            </p>
          </coaster-status-card>
        </section>

        <!-- Categories -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Categories Components
          </h2>
          <coaster-category-tabs
            [tabs]="[
              { id: '1', label: 'All' },
              { id: '2', label: 'Drinks' },
              { id: '3', label: 'Food' },
              { id: '4', label: 'Merch' },
            ]"
            selectedTabId="2"
          >
          </coaster-category-tabs>
        </section>

        <!-- Shifts -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Shifts Components
          </h2>
          <coaster-horizontal-date-scroller
            [days]="[
              { dayName: 'MON', dayNumber: 20, isActive: false },
              { dayName: 'TUE', dayNumber: 21, isActive: true },
              { dayName: 'WED', dayNumber: 22, isActive: false },
              { dayName: 'THU', dayNumber: 23, isActive: false },
            ]"
          ></coaster-horizontal-date-scroller>

          <coaster-shift-card
            staffName="Alice Wonderland"
            staffImage="https://i.pravatar.cc/150?img=5"
            timeRange="08:00 - 16:00"
            roleName="Bartender"
            roleColorClass="text-primary bg-primary"
          ></coaster-shift-card>
        </section>

        <!-- Members -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Members Components
          </h2>
          <coaster-staff-member-card
            staffName="Bob Builder"
            staffImage="https://i.pravatar.cc/150?img=8"
            roleName="Security"
            [isOffDuty]="false"
          ></coaster-staff-member-card>

          <coaster-staff-member-card
            staffName="Charlie Chaplin"
            staffImage="https://i.pravatar.cc/150?img=9"
            roleName="Waiter"
            [isOffDuty]="true"
          ></coaster-staff-member-card>
        </section>

        <!-- Products -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Products Components
          </h2>
          <coaster-inventory-item-card
            itemName="Craft Beer IPA"
            locationText="Main Fridge"
            [qty]="42"
            icon="lucideWine"
            statusLevel="good"
          ></coaster-inventory-item-card>
        </section>

        <!-- Exchanges -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Exchanges Components
          </h2>
          <coaster-exchange-request-card
            month="APR"
            day="15"
            shiftPeriod="Night Shift"
            roleName="Manager"
            timeRange="22:00 - 06:00"
            offeredBy="David"
          ></coaster-exchange-request-card>
        </section>

        <!-- Bottom Sheet standalone test -->
        <section class="flex flex-col gap-4">
          <h2
            class="text-2xl font-black text-primary uppercase tracking-wider border-b border-outline-variant pb-2"
          >
            Bottom Sheet (Inline Test)
          </h2>
          <div
            class="relative h-64 border border-outline border-dashed rounded-xl overflow-hidden"
          >
            <coaster-bottom-sheet>
              <h3 class="text-xl font-bold mb-2">Acciones Disponibles</h3>
              <p class="text-on-surface-variant text-sm mb-6">
                Selecciona una de las siguientes opciones para continuar con la
                gestión de este turno.
              </p>

              <div class="flex flex-col gap-3">
                <coaster-primary-button icon="lucideCheck" customClass="w-full">
                  Confirmar Asignación
                </coaster-primary-button>
              </div>
            </coaster-bottom-sheet>
          </div>
        </section>
      </div>

      <coaster-bottom-nav></coaster-bottom-nav>
    </div>
  `,
})
export default class DevSandboxComponent {}
