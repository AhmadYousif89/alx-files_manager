import { ObjectId } from 'mongodb';

import { ApiError } from '../middlewares/errors';
import redisClient from './redis';
import mongoDB from './db';

/**
 * Retrieves the user based on the x-token header.
 * @param {Request} req - The Express request object.
 * @throws {ApiError} - Throws an error if the token is invalid or user not found.
 * @returns {Promise<{_id: ObjectId; email: string}> | null} - The user object if
 * the token is valid and user is found. Otherwise, returns null.
 */
const getUserFromHeader = async (req) => {
  const token = req.headers['x-token'];
  if (!token) return null;

  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const user = await mongoDB.users.findOne({ _id: ObjectId(userId) }, { projection: { email: 1 } });
  if (!user) throw new ApiError(401, 'Unauthorized');

  return user;
};

export default getUserFromHeader;
