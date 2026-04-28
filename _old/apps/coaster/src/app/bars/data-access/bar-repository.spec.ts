import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { BarRepository } from './bar-repository';

describe('BarRepository', () => {
  let service: BarRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });

    service = TestBed.inject(BarRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('routes', () => {
    it('should have the public routes', () => {
      expect(service.routes).toBeTruthy();
    });

    it('should have the my bars route', () => {
      expect(service.routes.myBars).toBe('/bars');
    });

    it('should have the bar route', () => {
      expect(service.routes.bar(asBarId('1'))).toBe('/bars/1');
    });

    it('should have the create route', () => {
      expect(service.routes.create).toBe('/bars');
    });
  });

  describe('create function', () => {
    it('should be created', () => {
      expect(service.create).toBeTruthy();
    });

    it('should call create bar endpoint', async () => {
      const res = service.create({ name: 'Test Bar' });

      const req = httpMock.expectOne(service.routes.create);
      req.flush({ id: asBarId('1'), name: 'Test Bar' });
      expect(req.request.method).toBe('POST');

      await res;
    });

    it('should return the created bar', async () => {
      const bar: Bar = { id: asBarId('1'), name: 'Test Bar' };
      const res = service.create({ name: 'Test Bar' });

      const req = httpMock.expectOne(service.routes.create);
      req.flush(bar);

      expect(await res).toEqual(bar);
    });

    describe('mapper', () => {
      it('should map the response to a bar', async () => {
        const bar: Bar = { id: asBarId('1'), name: 'Test Bar' };
        const res = service.create({ name: 'Test Bar' });

        const req = httpMock.expectOne(service.routes.create);
        req.flush(bar);

        expect(await res).toEqual(bar);
      });
    });
  });
});
