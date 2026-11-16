import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () =>
    request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'));

  afterEach(async () => {
    await app.close();
  });

  it('/health/live (GET)', () =>
    request(app.getHttpServer()).get('/health/live').expect(200).expect({
      status: 'ok',
      service: 'kms-backend',
    }));

  it('/health/ready (GET)', () =>
    request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'kms-backend',
        dependencies: {
          database: 'up',
        },
      }));
});
