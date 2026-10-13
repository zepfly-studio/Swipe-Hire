// Local MongoDB for development, kept separate from the API process so that
// API restarts (node --watch) never fight over the database files.
// Data lives in server/.data/db. Started by `npm run dev` at the repo root.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = Number(process.env.DEV_DB_PORT) || 27027;
const dbPath = fileURLToPath(new URL('../.data/db', import.meta.url));
fs.mkdirSync(dbPath, { recursive: true });

const mongod = await MongoMemoryServer.create({ instance: { port: PORT, dbPath, storageEngine: 'wiredTiger' } });
console.log(`[dev-db] MongoDB running at mongodb://127.0.0.1:${PORT}/swipehire (data: server/.data/db)`);

const stop = async () => {
  await mongod.stop({ doCleanup: false }).catch(() => {});
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30); // keep the process alive
