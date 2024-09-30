import sharp from 'sharp';
import Queue from 'bull/lib/queue';
import { ObjectId } from 'mongodb';
import mongoDB from './utils/db';

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('emailQueue');

/**
 *
 * @param {string} filePath The path to the file
 * @param {[500|250|100]} size The size of the thumbnail
 * @returns {Promise<void>} A promise that resolves when the thumbnail is created
 */
const createThumbnail = async (filePath, size) => {
  try {
    const thumbnailPath = `${filePath}_${size}.png`;
    const thumbnail = await sharp(filePath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(thumbnailPath);
    console.log(
      `New image created with dimensions: ${thumbnail.width}x${thumbnail.height}`,
    );
    console.log(thumbnail);
  } catch (error) {
    console.error(`Error creating thumbnail of size ${size}:`, error);
  }
};

fileQueue.process(async (job) => {
  try {
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
    const { width, height } = await sharp(filePath).metadata();
    console.log(`Original image dimensions: ${width}x${height}`);
    const sizes = [100, 250, 500];
    const thumbnailPromises = sizes.map((size) => createThumbnail(filePath, size));
    await Promise.allSettled(thumbnailPromises);
  } catch (error) {
    console.error('Error processing image:', error);
    throw error; // Re-throw the error to mark the job as failed
  }
});

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) throw new Error('Missing userId');

  const user = await mongoDB.users.findOne({ _id: ObjectId(userId) });
  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
  try {
    const creator = 'Ahmad Yousif';
    const subject = 'The Files Manager API';
    const href = 'https://github.com/ahmadyousif89';
    const content = `
      <main>
        <h1>Hello ${user.email},</h1>
        <p>
          Welcome to the <a href="${href}/alx-files_manager">Files Manager API</a>,
          a file management API built with Node and Express.js by
          <a href="${href}">${creator}</a>.
        </p>
      </main>
    `;
    // Mailer.sendMail(Mailer.buildMessage(user.email, subject, content));
  } catch (err) {
    console.error(err);
  }
});
