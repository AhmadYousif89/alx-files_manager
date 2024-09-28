import getUserFromHeader from '../utils/auth';
import asyncWrapper from './async_wrapper';
import { ApiError } from './errors';

export const authenticateUser = asyncWrapper(async (req, res, next) => {
  const user = await getUserFromHeader(req);
  req.user = user;
  next();
});

export const handleXToken = asyncWrapper(async (req, res, next) => {
  const token = req.headers['x-token'];
  if (!token) {
    throw new ApiError(401, 'Unauthorized: Missing x-token');
  }
  req.token = token;
  next();
});
