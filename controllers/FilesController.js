/* eslint-disable object-curly-newline */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

import asyncWrapper from '../middlewares/async_wrapper';
import { ApiError } from '../middlewares/errors';
import mongoDB from '../utils/db';

const FOLDER_RELATIVE_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

// POST /files
// Create a new file in DB and in disk
export const postUpload = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
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

  if (parentId !== 0) {
    const parent = await mongoDB.files.findOne({ _id: ObjectId(parentId) });
    if (!parent) {
      throw new ApiError(400, 'Parent not found');
    }
    if (parent && parent.type !== 'folder') {
      throw new ApiError(400, 'Parent is not a folder');
    }
  }

  // Handle folder creation in DB
  if (type === 'folder') {
    const file = await mongoDB.files.insertOne({
      userId,
      name,
      type,
      parentId,
      isPublic,
    });
    return res.status(201).json({
      id: file.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  // Handle file/image creation on disk
  try {
    if (!fs.existsSync(FOLDER_RELATIVE_PATH)) {
      fs.mkdirSync(FOLDER_RELATIVE_PATH, { recursive: true });
    }

    const base64Data = Buffer.from(data, 'base64');
    const fileName = uuidv4();
    const filePath = path.normalize(path.join(FOLDER_RELATIVE_PATH, fileName));

    fs.writeFileSync(filePath, base64Data);

    const fileData = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: filePath,
    };
    const file = await mongoDB.files.insertOne(fileData);
    return res
      .status(201)
      .json({ id: file.insertedId, userId, name, type, isPublic, parentId });
  } catch (err) {
    console.error(err);
    throw new ApiError(500, 'File creation failed');
  }
});

// GET /files? (optional query parameters: parentId, page, limit)
export const getIndex = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { parentId = 0, page = 0, limit = 20 } = req.query;
  const skip = +page * +limit;
  const filter = { userId, ...(parentId && parentId !== '0' && { parentId }) };

  const files = await mongoDB.files
    .aggregate([
      { $match: filter },
      { $skip: skip },
      { $limit: +limit },
      {
        $project: {
          _id: 0,
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: '$parentId',
        },
      },
    ])
    .toArray();

  return res.status(200).json(files);
});

// GET /files/:id
export const getShow = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { id } = req.params;
  const file = await mongoDB.files.findOne({ _id: ObjectId(id), userId });
  if (!file) {
    throw new ApiError(404, 'Not found');
  }

  const { _id, localPath, ...rest } = file;
  return res.status(200).json({ id, ...rest });
});

// PUT /files/:id/publish
export const putPublish = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { id } = req.params;
  const file = await mongoDB.files.findOne({ _id: ObjectId(id), userId });
  if (!file) {
    throw new ApiError(404, 'Not found');
  }

  const updatedFile = await mongoDB.files.findOneAndUpdate(
    { _id: ObjectId(id), userId },
    { $set: { isPublic: true } },
    { returnDocument: 'after' },
  );

  const { _id, localPath, ...rest } = updatedFile.value;
  return res.status(200).json({ id, ...rest });
});

// PUT /files/:id/unpublish
export const putUnpublish = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { id } = req.params;
  const file = await mongoDB.files.findOne({ _id: ObjectId(id), userId });
  if (!file) {
    throw new ApiError(404, 'Not found');
  }

  const updatedFile = await mongoDB.files.findOneAndUpdate(
    { _id: ObjectId(id), userId },
    { $set: { isPublic: false } },
    { returnDocument: 'after' },
  );

  const { _id, localPath, ...rest } = updatedFile.value;
  return res.status(200).json({ id, ...rest });
});
