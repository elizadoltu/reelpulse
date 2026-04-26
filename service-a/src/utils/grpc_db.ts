import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();
const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

let db: Db;

export async function connectDB() {
  try {
    await client.connect();
    db = client.db('sample_mflix'); // Your database name
    // Test the connection
    const result = await db.command({ ping: 1 });
    console.log('MongoDB ping result:', result);
    // print count of movies collection
    const moviesCount = await db.collection('movies').countDocuments();
    console.log(uri);
    console.log(`Movies collection count: ${moviesCount}`);
    console.log('Connected to MongoDB Cluster');
  } catch (err) {
    console.error('MongoDB connection failed', err);
    process.exit(1);
  }
}

export { db };
