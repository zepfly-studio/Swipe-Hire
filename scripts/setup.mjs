// First-time setup on a new computer: creates server/.env from server/.env.example
// with a fresh random JWT_SECRET. Run with: npm run setup
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, 'server', '.env.example');
const target = path.join(root, 'server', '.env');

if (fs.existsSync(target)) {
  console.log('server/.env already exists, leaving it as it is.');
} else {
  const secret = crypto.randomBytes(48).toString('base64url');
  const env = fs.readFileSync(example, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  fs.writeFileSync(target, env);
  console.log('Created server/.env with a new random JWT_SECRET.');
}
console.log('Next: npm run dev  ->  open http://localhost:5173');
