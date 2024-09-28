import { MongoClient } from 'mongodb';
// require('dotenv').config();

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || '27017';
const DATABASE = process.env.DB_DATABASE || 'files_manager';
const URI = `mongodb://${HOST}:${PORT}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(URI, { useUnifiedTopology: true });
    this.connected = false;
    this.client
      .connect()
      .then(() => {
        this.connected = true;
        this.db = this.client.db(DATABASE);
        this.users = this.db.collection('users');
        this.files = this.db.collection('files');
      })
      .catch((err) => {
        this.connected = false;
        console.error('Error connecting to the database:', err);
      });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    try {
      return this.db.collection('users').countDocuments();
    } catch (err) {
      console.error('Error counting users:', err);
      return 0;
    }
  }

  async nbFiles() {
    try {
      return this.db.collection('files').countDocuments();
    } catch (err) {
      console.error('Error counting files:', err);
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
