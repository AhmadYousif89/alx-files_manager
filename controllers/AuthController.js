import { v4 as uuidv4 } from 'uuid';

import { checkHashedPassword } from '../utils/encrypt';
import asyncWrapper from '../middlewares/async_wrapper';
import { ApiError } from '../middlewares/errors';
import redisClient from '../utils/redis';
import mongoDB from '../utils/db';

const EXPIRY_DATE = 60 * 60 * 24; // 24 hours

// GET /connect
// Sign in users by generating an authentication token
export const getConnect = asyncWrapper(async (req, res) => {
  const authHeader = req.headers.Authorization || req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    throw new ApiError(401, 'Unauthorized');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [email, password] = credentials.split(':');

  const user = await mongoDB.users.findOne({ email });
  if (!user || !checkHashedPassword(password, user.password)) {
    throw new ApiError(401, 'Unauthorized');
  }

  const token = uuidv4();
  const key = `auth_${token}`;

  await redisClient.set(key, user._id.toString(), EXPIRY_DATE);

  res.status(200).json({ token });
});

// GET /disconnect
// Sign out users by deleting the authentication token
export const getDisconnect = asyncWrapper(async (req, res) => {
  const key = `auth_${req.token}`;
  const userId = await redisClient.get(key);
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  await redisClient.del(key);

  res.status(204).end();
});
