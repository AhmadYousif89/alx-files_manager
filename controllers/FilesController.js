/* eslint-disable object-curly-newline */
import { contentType } from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import Queue from 'bull/lib/queue';
import path from 'path';
import fs from 'fs';

import asyncWrapper from '../utils/async_wrapper';
import { ApiError } from '../middlewares/errors';
import getUserFromHeader from '../utils/auth';
import mongoDB from '../utils/db';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Queue('fileQueue');

// POST /files
// Create a new file in DB and in a local disk folder
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

  if (parentId && parentId !== '0') {
    const parent = await mongoDB.files.findOne({ _id: ObjectId(parentId) });
    if (!parent) {
      throw new ApiError(400, 'Parent not found');
    }
    if (parent.type !== 'folder') {
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
    if (!fs.existsSync(FOLDER_PATH)) {
      await fs.promises.mkdir(FOLDER_PATH, { recursive: true });
    }

    const base64Data = Buffer.from(data, 'base64');
    const fileName = uuidv4();
    const filePath = path.join(FOLDER_PATH, fileName);

    await fs.promises.writeFile(filePath, base64Data);

    const fileData = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: filePath,
    };
    const file = await mongoDB.files.insertOne(fileData);

    // Add job to fileQueue for image thumbnail generation
    if (type === 'image') {
      await fileQueue.add({
        userId: userId.toString(),
        fileId: file.insertedId.toString(),
      });
    }

    return res
      .status(201)
      .json({ id: file.insertedId, userId, name, type, isPublic, parentId });
  } catch (err) {
    console.error(err);
    throw new ApiError(500, 'File creation failed');
  }
});

// GET /files/:id/data
// Return the file content based on the file id
export const getFile = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { size } = req.query;
  const file = await mongoDB.files.findOne({ _id: ObjectId(id) });

  if (!file) {
    throw new ApiError(404, 'Not found');
  }

  if (file.isPublic) {
    if (file.type === 'folder') throw new ApiError(400, "A folder doesn't have content");

    try {
      let fileName = file.localPath;
      if (size) fileName = `${file.localPath}_${size}`;
      const data = await fs.promises.readFile(fileName);
      const mimeType = contentType(file.name);
      return res.header('Content-Type', mimeType).status(200).send(data);
    } catch (error) {
      throw new ApiError(404, 'Not found');
    }
  }

  const user = await getUserFromHeader(req);
  if (!user) throw new ApiError(404, 'Not found');

  const userId = user._id;
  if (file.userId.toString() === userId.toString()) {
    if (file.type === 'folder') throw new ApiError(400, "A folder doesn't have content");

    try {
      let fileName = file.localPath;
      if (size) fileName = `${file.localPath}_${size}`;
      const mimeType = contentType(file.name);
      return res.header('Content-Type', mimeType).status(200).sendFile(fileName);
    } catch (error) {
      throw new ApiError(404, 'Not found');
    }
  }
  throw new ApiError(404, 'Not found');

  // let { localPath } = file;

  // if (size) {
  //   const validSizes = ['100', '250', '500'];
  //   if (validSizes.includes(size)) {
  //     const resizedPath = `${localPath}_${size}.png`;
  //     if (fs.existsSync(resizedPath)) {
  //       localPath = resizedPath;
  //     } else {
  //       throw new ApiError(404, 'Not found');
  //     }
  //   }
  // }

  // if (
  //   !fs.existsSync(localPath) ||
  //   !fs.statSync(localPath).isFile() ||
  //   !fs.statSync(localPath).size > 0
  // ) {
  //   throw new ApiError(404, 'Not found');
  // }

  // const mimeType = contentType(file.name) || 'application/octet-stream';
  // res.setHeader('Content-Type', mimeType);
  // return res.status(200).sendFile(localPath);
});

// GET /files? (optional query parameters: parentId, page, limit)
// Return the list of files based on the query parameters
export const getIndex = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { parentId = 0, page = 0, limit = 20 } = req.query;
  const skip = +page * +limit;
  const filter = {
    userId,
    ...(parentId && parentId !== '0' && { parentId: ObjectId(parentId) }),
  };

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
// Return the file metadata based on the file id
export const getShow = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { id } = req.params;
  const filter = { _id: ObjectId(id), userId: ObjectId(userId) };
  const file = await mongoDB.files.findOne(filter);
  if (!file) {
    throw new ApiError(404, 'Not found');
  }

  const { _id, localPath, ...rest } = file;
  return res.status(200).json({ id, ...rest });
});

// PUT /files/:id/publish
// Set the file as public based on the file id
export const putPublish = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { id } = req.params;
  const filter = { _id: ObjectId(id), userId: ObjectId(userId) };
  const file = await mongoDB.files.findOne(filter);
  if (!file) {
    throw new ApiError(404, 'Not found');
  }

  await mongoDB.files.updateOne(filter, { $set: { isPublic: true } });

  const { name, type, parentId } = file;
  return res.status(200).json({
    id,
    userId,
    name,
    type,
    isPublic: true,
    parentId,
  });
});

// PUT /files/:id/unpublish
// Set the file as private based on the file id
export const putUnpublish = asyncWrapper(async (req, res) => {
  const { user } = req;
  const userId = user._id;
  const { id } = req.params;
  const filter = { _id: ObjectId(id), userId: ObjectId(userId) };
  const file = await mongoDB.files.findOne(filter);
  if (!file) {
    throw new ApiError(404, 'Not found');
  }

  await mongoDB.files.updateOne(filter, { $set: { isPublic: false } });

  const { name, type, parentId } = file;
  return res.status(200).json({
    id,
    userId,
    name,
    type,
    isPublic: false,
    parentId,
  });
});
