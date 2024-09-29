import Queue from 'bull';
import { promises as fs } from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import mongoDB from './utils/db';

const fileQueue = new Queue('fileQueue');

/**
 *
 * @param {string} filePath The path to the file
 * @param {[500|250|100]} size The size of the thumbnail
 * @returns {Promise<void>} A promise that resolves when the thumbnail is created
 */
const createThumbnail = async (filePath, size) => {
  const thumbnail = await imageThumbnail(filePath, { width: size });
  const thumbnailPath = `${filePath}_${size}.png`;
  return fs.writeFile(thumbnailPath, thumbnail);
};

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const filter = { _id: ObjectId(fileId), userId: ObjectId(userId) };
  const file = await mongoDB.files.findOne(filter);
  if (!file) {
    throw new Error('File not found');
  }

  const filePath = file.localPath;
  const sizes = [500, 250, 100];
  const thumbnailPromises = sizes.map((size) => createThumbnail(filePath, size));
  await Promise.all(thumbnailPromises);
});
