import { hashPassword } from '../utils/encrypt';
import asyncWrapper from '../middlewares/async_wrapper';
import { ApiError } from '../middlewares/errors';
import mongoDB from '../utils/db';

// POST /users
export const postNew = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    throw new ApiError(400, 'Missing email');
  }
  if (!password) {
    throw new ApiError(400, 'Missing password');
  }

  const existingUser = await mongoDB.users.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Already exist');
  }

  const hashedPassword = hashPassword(password);
  const user = await mongoDB.users.insertOne({ email, password: hashedPassword });

  res.status(201).json({ id: user.insertedId, email });
});

// GET /users/me
export const getMe = asyncWrapper(async (req, res) => {
  const user = req.user;
  res.status(200).json({ id: user._id, email: user.email });
});
