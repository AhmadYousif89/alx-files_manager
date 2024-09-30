import sinon from 'sinon';
import { expect } from 'chai';

import mongoDB from '../../utils/db';
import redisClient from '../../utils/redis';
import { getStatus, getStats } from '../../controllers/AppController';

describe('Test AppController Methods', () => {
  describe('getStatus', () => {
    it('should return status of redis and db', () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };

      sinon.stub(redisClient, 'isAlive').returns(true);
      sinon.stub(mongoDB, 'isAlive').returns(true);

      getStatus(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ redis: true, db: true })).to.be.true;

      redisClient.isAlive.restore();
      mongoDB.isAlive.restore();
    });
  });

  describe('getStats', () => {
    it('should return number of users and files', async () => {
      const req = {};
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy(),
      };

      sinon.stub(mongoDB, 'nbUsers').resolves(10);
      sinon.stub(mongoDB, 'nbFiles').resolves(20);

      await getStats(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ users: 10, files: 20 })).to.be.true;

      mongoDB.nbUsers.restore();
      mongoDB.nbFiles.restore();
    });
  });
});
