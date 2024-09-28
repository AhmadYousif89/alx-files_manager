import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

import asyncWrapper from '../middlewares/async_wrapper';
import { ApiError } from '../middlewares/errors';
import redisClient from '../utils/redis';
import mongoDB from '../utils/db';

const FOLDER_RELATIVE_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
// POST /files
// Create a new file in DB and in disk
export const postUpload = asyncWrapper(async (req, res) => {
  const key = `auth_${req.token}`;
  const userId = await redisClient.get(key);
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const user = await mongoDB.users.findOne({ _id: ObjectId(userId) });
  if (!user) {
    throw new ApiError(401, 'Unauthorized');
  }
  // Validate the request body
  // type: either 'folder | file | image'
  // parentId: the parent folder id (0 if it's the root folder)
  // isPublic: a boolean to set the file/folder as public default is false
  // data: the file data (only for type: file | image)
  const { name, type, data, parentId = 0, isPublic = false } = req.body;

  const acceptedTypes = ['folder', 'file', 'image'];

  if (!name) {
    throw new ApiError(400, 'Missing name');
  }

  if (!type || !acceptedTypes.includes(type)) {
    throw new ApiError(400, 'Missing type');
  }

  if (!data && type !== 'folder') {
    throw new ApiError(400, 'Missing data');
  }

  const parent = await mongoDB.files.findOne({ userId, parentId });
  if (parentId !== 0) {
    if (!parent) {
      throw new ApiError(400, 'Parent not found');
    }
    if (parent && parent.type !== 'folder') {
      throw new ApiError(400, 'Parent is not a folder');
    }
  }

  // Create the file in the DB
  if (type === 'folder') {
    const file = await mongoDB.files.insertOne({
      userId,
      name,
      type,
      parentId,
      isPublic,
    });
    return res
      .status(201)
      .json({ id: file.insertedId, userId, name, type, isPublic, parentId });
  }

  // Create the file in the disk
  fs.mkdirSync(FOLDER_RELATIVE_PATH, { recursive: true });
  const base64Data = Buffer.from(data, 'base64');
  const fileName = uuidv4();
  const filePath = path.join(FOLDER_RELATIVE_PATH, fileName);
  fs.writeFileSync(filePath, base64Data);

  const file = await mongoDB.files.insertOne({
    userId,
    name,
    type,
    isPublic,
    parentId,
    localPath: filePath,
  });

  return res.status(201).json({
    id: file.insertedId,
    userId,
    name,
    type,
    isPublic,
    parentId,
  });
});

// GET /files
export const getIndex = asyncWrapper(async (req, res) => {});

// GET /files/:id
export const getShow = asyncWrapper(async (req, res) => {});
