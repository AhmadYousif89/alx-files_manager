import mongoDB from '../utils/db';
import redisClient from '../utils/redis';
import asyncWrapper from '../utils/async_wrapper';

// GET /api/v1/status
export const getStatus = (_req, res) => {
  res.status(200).json({ redis: redisClient.isAlive(), db: mongoDB.isAlive() });
};

// GET /api/v1/stats
export const getStats = asyncWrapper(async (_req, res) => {
  const users = await mongoDB.nbUsers();
  const files = await mongoDB.nbFiles();
  res.status(200).json({ users, files });
});
