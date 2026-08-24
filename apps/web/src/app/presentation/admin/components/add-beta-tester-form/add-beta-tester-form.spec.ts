import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminBetaTestersStore } from '@coaster/admin';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddBetaTesterForm } from './add-beta-tester-form';

describe('AddBetaTesterForm', () => {
  let component: AddBetaTesterForm;
  let fixture: ComponentFixture<AddBetaTesterForm>;
  const addBetaTester = vi.fn().mockResolvedValue(undefined);

  const submit = () => {
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    buttons.find((button) => button.type === 'submit')!.click();
  };

  const typeEmail = (value: string) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=email]');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    addBetaTester.mockClear();

    await TestBed.configureTestingModule({
      imports: [AddBetaTesterForm],
      providers: [provideTranslateService(), { provide: AdminBetaTestersStore, useValue: { addBetaTester } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddBetaTesterForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit canceled when the cancel button is clicked', () => {
    const spy = vi.spyOn(component.canceled, 'emit');
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));

    buttons.find((button) => button.type === 'button')!.click();

    expect(spy).toHaveBeenCalled();
  });

  it('should refuse to send an address that is not an address', async () => {
    typeEmail('not-an-email');

    submit();
    await fixture.whenStable();

    expect(addBetaTester).not.toHaveBeenCalled();
  });

  it('should refuse to send nothing at all', async () => {
    submit();
    await fixture.whenStable();

    expect(addBetaTester).not.toHaveBeenCalled();
  });

  it('should trim what it sends and drop an empty note', async () => {
    const spy = vi.spyOn(component.added, 'emit');
    typeEmail('  tester@bar.com  ');

    submit();
    await fixture.whenStable();

    expect(addBetaTester).toHaveBeenCalledWith({ email: 'tester@bar.com', note: undefined });
    expect(spy).toHaveBeenCalled();
  });

  it('should keep the form open when the server refuses the address', async () => {
    const spy = vi.spyOn(component.added, 'emit');
    addBetaTester.mockRejectedValueOnce(new Error('BETA_TESTER_ALREADY_EXISTS'));
    typeEmail('tester@bar.com');

    submit();
    await fixture.whenStable();

    expect(spy).not.toHaveBeenCalled();
    expect(component.form().errors().length).toBeGreaterThan(0);
  });
});
