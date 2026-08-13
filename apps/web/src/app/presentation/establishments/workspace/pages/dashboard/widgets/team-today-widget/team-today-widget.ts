import { Component, computed, effect, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentRole } from '@coaster/common';
import { MembersStore } from '@coaster/establishment-members';
import { ShiftsStore } from '@coaster/shifts';
import { TranslatePipe } from '@ngx-translate/core';

const ROLE_LABEL_KEYS: Record<EstablishmentRole, string> = {
  [EstablishmentRole.OWNER]: 'common.role.owner',
  [EstablishmentRole.MANAGER]: 'common.role.manager',
  [EstablishmentRole.STAFF]: 'common.role.staff',
};

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'coaster-team-today-widget',
  imports: [TranslatePipe, MatIcon, RouterLink],
  host: { class: 'block' },
  templateUrl: './team-today-widget.html',
})
export class TeamTodayWidget {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #membersStore = inject(MembersStore);
  readonly #shiftsStore = inject(ShiftsStore);

  constructor() {
    effect(() => {
      const establishmentId = this.establishmentId();
      this.#membersStore.setEstablishmentId(establishmentId);
      this.#shiftsStore.setEstablishmentId(establishmentId);
    });

    effect(() => {
      const now = new Date();
      const startIso = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endIso = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      this.#shiftsStore.setDateRange(startIso, endIso);
    });
  }

  readonly totalAssignedToday = computed(() => {
    if (!this.#shiftsStore.shifts.hasValue()) {
      return 0;
    }
    return this.#shiftsStore.shifts.value()?.length ?? 0;
  });

  readonly scheduleOverview = computed(() => {
    if (!this.#membersStore.list.hasValue() || !this.#shiftsStore.shifts.hasValue()) {
      return [];
    }

    const shifts = this.#shiftsStore.shifts.value();
    const members = this.#membersStore.list.value();

    if (!shifts || !members) {
      return [];
    }

    const now = new Date();

    return shifts
      .map((s) => {
        const member = members.find((m) => m.userId === s.userId);
        if (!member) return null;

        const start = new Date(s.startTime);
        const end = new Date(s.endTime);

        if (now > end) return null;

        const isCurrent = now >= start && now <= end;

        return {
          id: s.id,
          userName: member.userName,
          userImage: member.userImage,
          roleLabelKey: ROLE_LABEL_KEYS[member.role] ?? 'common.role.staff',
          timeRange: `${formatTime(start)} — ${formatTime(end)}`,
          status: isCurrent ? 'current' : 'next',
          startTime: start.getTime(),
        };
      })
      .filter((s) => !!s)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 3);
  });
}
