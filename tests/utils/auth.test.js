import sinon from 'sinon';
import { expect } from 'chai';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../middlewares/errors';
import getUserFromHeader from '../../utils/auth';
import redisClient from '../../utils/redis';
import mongoDB from '../../utils/db';

describe('Testing getUserFromHeader method', () => {
  let req;
  let redisGetStub;
  let mongoFindOneStub;

  beforeEach(() => {
    req = { headers: {} };
    redisGetStub = sinon.stub(redisClient, 'get');
    mongoFindOneStub = sinon.stub(mongoDB.users, 'findOne');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return null if x-token header is missing', async () => {
    const result = await getUserFromHeader(req);
    expect(result).to.be.null;
  });

  it('should throw ApiError if token is invalid', async () => {
    req.headers['x-token'] = 'Invalid-token';
    redisGetStub.resolves(null);

    try {
      await getUserFromHeader(req);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.instanceOf(ApiError);
      expect(error.statusCode).to.equal(401);
      expect(error.message).to.equal('Unauthorized');
    }
  });

  it('should throw ApiError if user is not found', async () => {
    req.headers['x-token'] = 'A-valid-token';
    const userId = '000000000000000000000000';
    redisGetStub.resolves(userId);
    mongoFindOneStub.resolves(null);

    try {
      await getUserFromHeader(req);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).to.be.instanceOf(ApiError);
      expect(error.statusCode).to.equal(401);
      expect(error.message).to.equal('Unauthorized');
    }
  });

  it('should return user object if token is valid and user is found', async () => {
    req.headers['x-token'] = 'A-valid-token';
    const userId = '000000000000000000000000';
    const user = { _id: ObjectId(userId), email: 'test@example.com' };

    redisGetStub.resolves(userId);
    mongoFindOneStub.resolves(user);

    const result = await getUserFromHeader(req);

    expect(result).to.deep.equal(user);
    expect(redisGetStub.calledOnceWith(`auth_${req.headers['x-token']}`)).to.be.true;
    expect(
      mongoFindOneStub.calledOnceWith(
        { _id: sinon.match.instanceOf(ObjectId) },
        { projection: { email: 1 } },
      ),
    ).to.be.true;
  });
});
