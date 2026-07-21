import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BarRepository } from '../data-access/bar-repository';
import { CreateCustomerPortalSession } from './create-customer-portal-session';

describe('CreateCustomerPortalSession', () => {
  let service: CreateCustomerPortalSession;

  const repositoryMock = {
    createCustomerPortalSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: BarRepository, useValue: repositoryMock },
      ],
    });
    service = TestBed.inject(CreateCustomerPortalSession);
  });

  it('should return undefined if barId is undefined', async () => {
    const result = await service.execute(undefined, 'http://return.url');
    expect(result).toBeUndefined();
  });

  it('should create a portal session and return url', async () => {
    repositoryMock.createCustomerPortalSession.mockResolvedValue({ url: 'http://stripe.portal' });
    
    const result = await service.execute('bar-1', 'http://return.url');
    
    expect(result).toBe('http://stripe.portal');
    expect(repositoryMock.createCustomerPortalSession).toHaveBeenCalledWith('bar-1', {
      returnUrl: 'http://return.url',
    });
  });

  it('should return undefined on error', async () => {
    repositoryMock.createCustomerPortalSession.mockRejectedValue(new Error('test error'));
    
    const result = await service.execute('bar-1', 'http://return.url');
    
    expect(result).toBeUndefined();
  });
});
