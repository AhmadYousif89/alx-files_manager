import chai from 'chai';
import chaiHttp from 'chai-http';
import { describe, it } from 'mocha';
import app from '../server';

chai.use(chaiHttp);
const { expect, request } = chai;

describe('Test Server', () => {
  it('should respond to GET /', async () => {
    const res = await request(app).get('/');
    expect(res).to.have.status(200);
    expect(res.text).to.equal('<h1>Welcome to the Files Manager API</h1>');
  });

  it('should respond to GET /non-existent-route with 404', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res).to.have.status(404);
    expect(res).to.be.json;
    expect(res.body.error).to.equal('Resource not found!');
  });

  it('should respond to GET /status with 200', async () => {
    const res = await request(app).get('/status');
    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({ redis: true, db: true });
  });

  it('should respond to GET /stats with 200', async () => {
    const res = await request(app).get('/stats');
    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({ users: 0, files: 0 });
  });
});
