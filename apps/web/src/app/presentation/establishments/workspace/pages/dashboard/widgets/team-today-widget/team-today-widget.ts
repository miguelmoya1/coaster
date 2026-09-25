import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { EstablishmentId, EstablishmentMember, Shift } from '@coaster/common';
import { EstablishmentRole } from '@coaster/common';
import { loadedOr, type PageResource } from '@coaster/core';
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
  public readonly shifts = input.required<PageResource<Shift[]>>();
  public readonly members = input.required<PageResource<EstablishmentMember[]>>();

  readonly totalAssignedToday = computed(() => loadedOr(this.shifts(), []).length);

  readonly scheduleOverview = computed(() => {
    const shifts = loadedOr(this.shifts(), []);
    const members = loadedOr(this.members(), []);

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
