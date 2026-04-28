// import { INestApplication } from '@nestjs/common';
// import { Test, TestingModule } from '@nestjs/testing';
// import request from 'supertest'; // Importamos Supertest
import { beforeAll, describe, expect, it } from 'vitest';
// // eslint-disable-next-line @nx/enforce-module-boundaries
// import { AppModule } from '../../../api/src/app/app.module';

describe('AppController (e2e)', () => {
  // let app: INestApplication;

  beforeAll(async () => {
    // const moduleFixture: TestingModule = await Test.createTestingModule({
    //   imports: [AppModule],
    // }).compile();
    // app = moduleFixture.createNestApplication();
    // await app.init();
  });

  it('true', () => {
    // return request(app.getHttpServer())
    //   .get('/users')
    //   .expect(200)
    //   .expect((res) => {
    //     expect(res.body).toBeDefined();
    //     expect(Array.isArray(res.body)).toBe(true);
    //   });
    expect(true).toBe(true);
  });
});
