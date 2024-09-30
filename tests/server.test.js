import request from 'supertest';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import app from '../server';

describe('Test Server', () => {
  const server = request(app);

  it('should respond to GET /', async () => {
    const res = await server.get('/').expect(200);
    expect(res.text).to.equal('<h1>Welcome to the Files Manager API</h1>');
  });

  it('should respond to GET /non-existent-route with 404', async () => {
    const res = await server
      .get('/non-existent-route')
      .expect('Content-Type', /json/)
      .expect(404);
    expect(res.body.error).to.be.eq('Resource not found!');
  });

  it('should respond to GET /status with 200', async () => {
    const res = await server.get('/status').expect(200);
    expect(res.body).to.be.deep.eq({ redis: true, db: true });
  });

  it('should respond to GET /stats with 200', async () => {
    const res = await server.get('/stats').expect(200);
    expect(res.body).to.be.deep.eq({ users: 0, files: 0 });
  });
});
