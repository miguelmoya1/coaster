import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { urlInterceptor } from './url-interceptor';

describe('urlInterceptor', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([urlInterceptor])), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should prefix relative urls with API_URL and API_VERSION', () => {
    const testPath = '/test';
    const httpClient = TestBed.inject(HttpClient);

    // We fetch a relative URL
    httpClient.get(testPath).subscribe();

    // It should be intercepted and transformed
    const req = httpMock.expectOne((request) => request.url.includes('/api/v1/test'));
    expect(req.request.url).toMatch(/http:\/\/localhost:3000\/api\/v1\/test|https:\/\/api.coaster.app\/api\/v1\/test/);
  });

  it('should not prefix absolute urls', () => {
    const testUrl = 'http://external.com/api';
    const httpClient = TestBed.inject(HttpClient);

    httpClient.get(testUrl).subscribe();

    const req = httpMock.expectOne(testUrl);
    expect(req.request.url).toBe(testUrl);
  });
});
