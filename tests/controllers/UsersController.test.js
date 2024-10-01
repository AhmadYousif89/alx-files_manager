import chai from 'chai';
import Queue from 'bull';
import sinon from 'sinon';
import chaiHttp from 'chai-http';
import { ObjectId } from 'mongodb';
import { describe, it, before, after } from 'mocha';

import app from '../../server';
import mongoDB from '../../utils/db';
import redisClient from '../../utils/redis';

chai.use(chaiHttp);
const { expect, request } = chai;

describe('Testing UsersController Methods', () => {
  let userQueueStub;

  before(() => {
    // Stub the userQueue.add method
    userQueueStub = sinon.stub(Queue.prototype, 'add');
  });

  after(async () => {
    // Restore the stubbed method
    userQueueStub.restore();
    await mongoDB.users.deleteMany({});
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const newUser = { email: 'test@example.com', password: 'password123' };

      const res = await request(app).post('/users').send(newUser).set('Accept', 'application/json');

      expect(res).to.have.status(201);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('email', newUser.email);

      // Check if the user was added to the database
      const user = await mongoDB.users.findOne({ email: newUser.email });
      expect(user).to.exist;
      expect(user.password).to.not.equal(newUser.password);

      // Check if the welcome email was queued
      expect(userQueueStub.calledOnce).to.be.true;
      expect(userQueueStub.firstCall.args[0]).to.equal('sendWelcomeEmail');
      expect(userQueueStub.firstCall.args[1]).to.have.property('userId');
    });

    it('should return an error if email is missing', async () => {
      const newUser = { password: 'password123' };

      const res = await request(app).post('/users').send(newUser);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('error', 'Missing email');
    });

    it('should return an error if password is missing', async () => {
      const newUser = { email: 'test@example.com' };

      const res = await request(app).post('/users').send(newUser);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('error', 'Missing password');
    });

    it('should return an error if user already exists', async () => {
      const existingUser = { email: 'existing@example.com', password: 'password123' };

      await mongoDB.users.insertOne(existingUser);

      const res = await request(app).post('/users').send(existingUser);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('error', 'Already exist');
    });
  });

  describe('GET /users/me', () => {
    it('should return the current user', async () => {
      const user = { _id: new ObjectId(), email: 'test@example.com' };
      const token = 'fake-token';

      // Mock the Redis client to return the userId for the token
      const redisGetStub = sinon.stub(redisClient, 'get').resolves(user._id.toString());
      // Mock MongoDB to return the user for the userId
      const mongoFindOneStub = sinon.stub(mongoDB.users, 'findOne').resolves(user);
      // Make the request
      const res = await chai.request(app).get('/users/me').set('X-token', token);
      // Ensure stubs were called
      expect(redisGetStub.calledOnce).to.be.true;
      expect(mongoFindOneStub.calledOnce).to.be.true;
      // Assert the response
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('id', user._id.toString());
      expect(res.body).to.have.property('email', user.email);
      // Restore stubs after test
      redisGetStub.restore();
      mongoFindOneStub.restore();
    });
  });
});
