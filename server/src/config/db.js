import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { config } from './index.js';
import { DATA_DIR } from './paths.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Dev fallback: a real mongod binary that keeps its data on disk in server/.data
async function startLocalMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.join(DATA_DIR, 'db');
  fs.mkdirSync(dbPath, { recursive: true });

  // After a quick restart (node --watch) the previous mongod may still hold the
  // lock file for a moment, so retry briefly instead of crashing.
  for (let attempt = 1; ; attempt++) {
    try {
      const mongod = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });
      const stop = async () => {
        await mongoose.disconnect().catch(() => {});
        await mongod.stop({ doCleanup: false }).catch(() => {});
        process.exit(0);
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
      return mongod.getUri('swipehire');
    } catch (err) {
      if (!String(err.message).includes('DBPathInUse') || attempt >= 10) throw err;
      await sleep(1000);
    }
  }
}

export async function connectDB() {
  let uri = config.mongoUri;
  if (!uri) {
    if (config.isProd) throw new Error('MONGO_URI is required in production');
    uri = await startLocalMongo();
    console.log('[db] MONGO_URI not set - using local dev database');
  }
  await mongoose.connect(uri);
  console.log('[db] connected');
  const { migrate } = await import('./migrate.js');
  await migrate();
}
