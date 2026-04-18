import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarRole } from '@coaster/interfaces';
import { TranslateModule } from '@ngx-translate/core';
import { BarRoleBadge } from './bar-role-badge';

describe('BarRoleBadge', () => {
  let component: BarRoleBadge;
  let fixture: ComponentFixture<BarRoleBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarRoleBadge, TranslateModule.forRoot()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(BarRoleBadge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default color and label when no role is provided', () => {
    expect(component.dotColorClass()).toContain('bg-primary');
    expect(component.labelKey()).toBe('bars.select.operational');
  });

  it('should show OWNER role colors and label', () => {
    fixture.componentRef.setInput('role', BarRole.OWNER);
    fixture.detectChanges();

    expect(component.dotColorClass()).toBe('bg-primary text-primary');
    expect(component.labelKey()).toBe('common.role.owner');
  });

  it('should show STAFF role colors and label', () => {
    fixture.componentRef.setInput('role', BarRole.STAFF);
    fixture.detectChanges();

    expect(component.dotColorClass()).toBe('bg-orange-500 text-orange-500');
    expect(component.labelKey()).toBe('common.role.staff');
  });
});
