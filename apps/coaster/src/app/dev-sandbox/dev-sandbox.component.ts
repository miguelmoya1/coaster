import { Component } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucidePlus, lucideWine } from '@ng-icons/lucide';
import { CategoryTabsComponent } from '../categories/components/category-tabs/category-tabs.component';
import { ExchangeRequestCardComponent } from '../exchanges/components/exchange-request-card/exchange-request-card.component';
import { StaffMemberCardComponent } from '../members/components/staff-member-card/staff-member-card.component';
import { InventoryItemCardComponent } from '../products/components/inventory-item-card/inventory-item-card.component';
import { AvatarBadgeComponent } from '../shared/components/avatar-badge/avatar-badge.component';
import { BottomNavComponent } from '../shared/components/bottom-nav/bottom-nav.component';
import { BottomSheetComponent } from '../shared/components/bottom-sheet/bottom-sheet.component';
import { FabComponent } from '../shared/components/fab/fab.component';
import { PrimaryButtonComponent } from '../shared/components/primary-button/primary-button.component';
import { StatusCardComponent } from '../shared/components/status-card/status-card.component';
import { TopAppBarComponent } from '../shared/components/top-app-bar/top-app-bar.component';
import { HorizontalDateScrollerComponent } from '../shifts/components/horizontal-date-scroller/horizontal-date-scroller.component';
import { ShiftCardComponent } from '../shifts/components/shift-card/shift-card.component';

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
  ],
  providers: [provideIcons({ lucideCheck, lucidePlus, lucideWine })],
  template: `
    <div class="mt-24"></div>
    <div class="bg-surface pb-24 min-h-screen text-on-surface font-sans">
      <coaster-top-app-bar
        title="Dev Sandbox"
        userImage="https://i.pravatar.cc/150?img=11"
      ></coaster-top-app-bar>

      <div class="p-6 flex flex-col gap-10">
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
            <coaster-bottom-sheet></coaster-bottom-sheet>
          </div>
        </section>
      </div>

      <coaster-bottom-nav></coaster-bottom-nav>
    </div>
  `,
})
export default class DevSandboxComponent {}
