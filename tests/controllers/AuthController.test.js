import sinon from 'sinon';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

import { getConnect, getDisconnect } from '../../controllers/AuthController';
import { checkHashedPassword } from '../../utils/encrypt';

import redisClient from '../../utils/redis';
import mongoDB from '../../utils/db';

describe('Test AuthController Methods', () => {
  describe('getConnect', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = { status: sinon.stub().returns({ json: sinon.spy() }) };
      next = sinon.spy();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return 401 if no Authorization header is present', async () => {
      await getConnect(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].statusCode).to.equal(401);
      expect(next.args[0][0].message).to.equal('Unauthorized');
    });

    it('should return 401 if Authorization header is not Basic', async () => {
      req.headers.authorization = 'Bearer token';
      await getConnect(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].statusCode).to.equal(401);
      expect(next.args[0][0].message).to.equal('Unauthorized');
    });

    it('should return 401 if user is not found', async () => {
      const base64Credentials = Buffer.from('test@example.com:password').toString(
        'base64',
      );
      req.headers.authorization = 'Basic ' + base64Credentials;
      sinon.stub(mongoDB.users, 'findOne').resolves(null);
      await getConnect(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].statusCode).to.equal(401);
      expect(next.args[0][0].message).to.equal('Unauthorized');
    });

    it('should return 401 if password is incorrect', async () => {
      const base64Credentials = Buffer.from('test@example.com:password').toString(
        'base64',
      );
      req.headers.authorization = 'Basic ' + base64Credentials;
      sinon
        .stub(mongoDB.users, 'findOne')
        .resolves({ email: 'test@example.com', password: 'hashedPassword' });
      sinon.stub(checkHashedPassword).returns(false);
      await getConnect(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].statusCode).to.equal(401);
      expect(next.args[0][0].message).to.equal('Unauthorized');
    });

    it('should return 200 and a token if credentials are valid', async () => {
      req.headers.authorization =
        'Basic ' + Buffer.from('test@example.com:password').toString('base64');
      sinon.stub(mongoDB.users, 'findOne').resolves({
        _id: 'userId',
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      sinon.stub(checkHashedPassword).returns(true);
      sinon.stub(uuidv4).returns('generatedToken');
      sinon.stub(redisClient, 'set').resolves();

      await getConnect(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.status().json.calledWith({ token: 'generatedToken' })).to.be.true;
      expect(redisClient.set.calledWith('auth_generatedToken', 'userId', 60 * 60 * 24)).to
        .be.true;
    });
  });

  describe('getDisconnect', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        token: 'validToken',
      };
      res = {
        status: sinon.stub().returns({ end: sinon.spy() }),
      };
      next = sinon.spy();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return 401 if token is not found in Redis', async () => {
      sinon.stub(redisClient, 'get').resolves(null);
      await getDisconnect(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0].statusCode).to.equal(401);
      expect(next.args[0][0].message).to.equal('Unauthorized');
    });

    it('should return 204 and delete the token if it exists', async () => {
      sinon.stub(redisClient, 'get').resolves('userId');
      sinon.stub(redisClient, 'del').resolves();

      await getDisconnect(req, res, next);

      expect(redisClient.get.calledWith('auth_validToken')).to.be.true;
      expect(redisClient.del.calledWith('auth_validToken')).to.be.true;
      expect(res.status.calledWith(204)).to.be.true;
      expect(res.status().end.calledOnce).to.be.true;
    });
  });
});
