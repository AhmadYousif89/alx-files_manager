import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import mongoClient from '../../utils/db';

describe('Testing MongoDB Client', () => {
  after(async () => {
    await mongoClient.users.deleteMany({});
    await mongoClient.files.deleteMany({});
  });

  it('Should connect with mongosh', () => {
    expect(mongoClient.isAlive()).to.be.true;
  });

  describe('Files Collection', () => {
    it('Should have the files collection', () => {
      expect(mongoClient.files.collectionName).to.equal('files');
      expect(mongoClient.files.namespace).to.equal('files_manager.files');
      expect(mongoClient.files).to.be.an.instanceOf(Object);
    });

    it('Should insert a new document in the files collection', async () => {
      const file = {
        userId: '123',
        name: 'test-file',
        type: 'file',
        parentId: 0,
        isPublic: false,
      };
      const result = await mongoClient.files.insertOne(file);
      const insertedFile = await mongoClient.files.findOne({ _id: result.insertedId });

      expect(insertedFile).to.have.property('userId', file.userId);
      expect(insertedFile).to.have.property('name', file.name);
      expect(insertedFile).to.have.property('type', file.type);
      expect(insertedFile).to.have.property('parentId', file.parentId);
      expect(insertedFile).to.have.property('isPublic', file.isPublic);
    });

    it('Should find the inserted document in the files collection', async () => {
      const file = {
        userId: '123',
        name: 'test-file',
        type: 'file',
        parentId: 0,
        isPublic: false,
      };
      const insertedFile = await mongoClient.files.insertOne(file);
      const foundFile = await mongoClient.files.findOne({ _id: insertedFile.insertedId });
      expect(foundFile).to.have.property('userId', file.userId);
      expect(foundFile).to.have.property('name', file.name);
      expect(foundFile).to.have.property('type', file.type);
      expect(foundFile).to.have.property('parentId', file.parentId);
      expect(foundFile).to.have.property('isPublic', file.isPublic);
    });

    it('Should find all the documents in the files collection', async () => {
      const files = await mongoClient.files.find().toArray();
      expect(files).to.be.an('array');
      expect(files.length).to.be.greaterThan(0);
    });
  });

  describe('Users Collection', () => {
    it('Should have the users collection', () => {
      expect(mongoClient.users.collectionName).to.equal('users');
      expect(mongoClient.users.namespace).to.equal('files_manager.users');
      expect(mongoClient.users).to.be.an.instanceOf(Object);
    });

    it('Should insert a new document in the users collection', async () => {
      const user = {
        email: 'test@example.com',
        password: 'hashedpassword',
      };
      const result = await mongoClient.users.insertOne(user);
      const insertedUser = await mongoClient.users.findOne({ _id: result.insertedId });
      expect(insertedUser).to.have.property('email', user.email);
      expect(insertedUser).to.have.property('password', user.password);
    });

    it('Should find the inserted document in the users collection', async () => {
      const user = {
        email: 'test@example.com',
        password: 'hashedpassword',
      };
      const insertedUser = await mongoClient.users.insertOne(user);
      const foundUser = await mongoClient.users.findOne({ _id: insertedUser.insertedId });
      expect(foundUser).to.have.property('email', user.email);
      expect(foundUser).to.have.property('password', user.password);
    });
  });

  describe('Integration between Users and Files', () => {
    it('Should create a file associated with a user', async () => {
      const user = {
        email: 'fileowner@example.com',
        password: 'hashedpassword',
      };
      const insertedUser = await mongoClient.users.insertOne(user);

      const file = {
        userId: insertedUser.insertedId.toString(),
        name: 'user-file',
        type: 'file',
        parentId: 0,
        isPublic: false,
      };
      const insertedFile = await mongoClient.files.insertOne(file);

      const foundFile = await mongoClient.files.findOne({ _id: insertedFile.insertedId });
      expect(foundFile).to.have.property('userId', insertedUser.insertedId.toString());
    });

    it('Should find all files for a specific user', async () => {
      const user = {
        email: 'multifileuser@example.com',
        password: 'hashedpassword',
      };
      const insertedUser = await mongoClient.users.insertOne(user);

      const file1 = {
        userId: insertedUser.insertedId.toString(),
        name: 'user-file-1',
        type: 'file',
        parentId: 0,
        isPublic: false,
      };
      const file2 = {
        userId: insertedUser.insertedId.toString(),
        name: 'user-file-2',
        type: 'file',
        parentId: 0,
        isPublic: true,
      };

      await mongoClient.files.insertMany([file1, file2]);

      const userFiles = await mongoClient.files
        .find({ userId: insertedUser.insertedId.toString() })
        .toArray();
      expect(userFiles).to.be.an('array');
      expect(userFiles.length).to.equal(2);
      expect(userFiles[0]).to.have.property('name', 'user-file-1');
      expect(userFiles[1]).to.have.property('name', 'user-file-2');
    });
  });

  describe('Counting documents', () => {
    it('Should count the number of users', async () => {
      const usersCount = await mongoClient.nbUsers();
      expect(usersCount).to.be.greaterThan(0);
    });

    it('Should count the number of files', async () => {
      const filesCount = await mongoClient.nbFiles();
      expect(filesCount).to.be.greaterThan(0);
    });
  });
});
