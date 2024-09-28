import asyncWrapper from './async_wrapper';
import { ApiError } from './errors';

const checkXTokenHeader = asyncWrapper(async (req, res, next) => {
  const token = req.headers['x-token'];
  if (!token) {
    throw new ApiError(401, 'Unauthorized');
  }
  req.token = token;
  next();
});

export default checkXTokenHeader;
