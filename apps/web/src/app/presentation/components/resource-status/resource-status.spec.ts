import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ResourceStatus } from './resource-status';

describe('ResourceStatus', () => {
  let fixture: ComponentFixture<ResourceStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceStatus],
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceStatus);
  });

  const render = async (
    resource: ReturnType<typeof fakeResource>['resource'] | ReturnType<typeof fakeResource>['resource'][],
  ) => {
    fixture.componentRef.setInput('resource', resource);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('should show progress while the first load is on its way', async () => {
    const element = await render(fakeResource<string[]>().resource);

    expect(element.querySelector('coaster-loading')).toBeTruthy();
  });

  it('should show nothing once there is something to show', async () => {
    const element = await render(fakeResource(['a']).resource);

    expect(element.textContent?.trim()).toBe('');
  });

  it('should say what went wrong and try again on request', async () => {
    const failing = fakeResource<string[]>();
    failing.fail(new Error('ORDER_NOT_FOUND'));
    const element = await render(failing.resource);

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('ORDER_NOT_FOUND');

    (element.querySelector('button') as HTMLButtonElement).click();
    expect(failing.resource.reload).toHaveBeenCalled();
  });

  it('should show a single progress bar for several resources, and the one that failed', async () => {
    const failing = fakeResource<string[]>();
    failing.fail(new Error('CATEGORY_NOT_FOUND'));

    const loadingOnly = await render([fakeResource<string[]>().resource, fakeResource<string[]>().resource]);
    expect(loadingOnly.querySelectorAll('coaster-loading')).toHaveLength(1);

    const withError = await render([fakeResource(['a']).resource, failing.resource]);
    expect(withError.querySelector('[role="alert"]')?.textContent).toContain('CATEGORY_NOT_FOUND');
  });
});
