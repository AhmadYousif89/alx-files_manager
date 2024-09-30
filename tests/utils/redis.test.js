import { expect } from 'chai';
import redisClient from '../../utils/redis';

describe('Testing Redis Client', () => {
  it('Should connect with redis-server', () => {
    expect(redisClient.isAlive()).to.equal(true);
  });

  it('Should have the get, set and del methods', () => {
    expect(redisClient.get).to.be.a('function');
    expect(redisClient.set).to.be.a('function');
    expect(redisClient.del).to.be.a('function');
  });

  it('Should set a key and retrive it correctly', async () => {
    await redisClient.set('test_key', 500, 2); // key, value, duration
    expect(await redisClient.get('test_key')).to.equal('500');
  });

  it('Should set a key and delete it after 2 seconds', async () => {
    await redisClient.set('test_key', 500, 2);
    setTimeout(async () => {
      expect(await redisClient.get('test_key')).to.be.null;
    }, 2000);
  });

  it('Should not get a key that does not exist', async () => {
    expect(await redisClient.get('non_existent_key')).to.be.null;
  });

  it('Should delete a key correctly', async () => {
    await redisClient.set('test_key', 500, 2);
    await redisClient.del('test_key');
    expect(await redisClient.get('test_key')).to.be.null;
  });
});
