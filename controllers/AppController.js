import mongoDB from '../utils/db';
import redisClient from '../utils/redis';
import asyncWrapper from '../utils/async_wrapper';

// GET /api/v1/status
export const getStatus = (_, res) => {
  const status = { redis: redisClient.isAlive(), db: mongoDB.isAlive() };
  return res.status(200).json(status);
};

// GET /api/v1/stats
export const getStats = asyncWrapper(async (_, res) => {
  const users = await mongoDB.nbUsers();
  const files = await mongoDB.nbFiles();
  return res.status(200).json({ users, files });
});
