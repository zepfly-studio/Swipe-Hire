// Starts the real API on a throw-away in-memory MongoDB for integration tests. Your local and
// live data are never touched, and no email is sent (codes come back in the answers instead).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function startTestApi(port) {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('apitest');
  await mongoose.connect(uri);
  const env = {
    ...process.env, PORT: String(port), MONGO_URI: uri, NODE_ENV: 'test', JWT_SECRET: 'api-test-secret-api-test-secret-123456',
    SHOW_EMAIL_CODE: 'true', RESEND_API_KEY: '', BREVO_API_KEY: '', SMTP_HOST: '', SMTP_PASS: '', CLOUDINARY_URL: '', CLOUDINARY_CLOUD_NAME: '',
    CLIENT_URL: 'http://localhost:5173', DEMO_PAYMENTS: 'true',
  };
  const server = spawn(process.execPath, ['src/index.js'], { cwd: fileURLToPath(new URL('..', import.meta.url)), env, stdio: 'pipe' });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('API did not start')), 30000);
    server.stdout.on('data', (d) => String(d).includes('running on') && (clearTimeout(t), resolve()));
    server.on('exit', (c) => reject(new Error(`API exited (${c})`)));
  });

  const api = `http://localhost:${port}/api`;
  // call(method, url, body, token) -> { status, data }
  const call = async (method, url, body, token) => {
    const res = await fetch(api + url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Auth-Mode': 'token', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  // A verified account of the given role; returns its token.
  const signUp = async (name, email, role, password = 'secret12') => {
    const reg = await call('POST', '/auth/register', { name, email, password, role });
    const code = await call('POST', '/auth/email/send', undefined, reg.data.token);
    await call('POST', '/auth/email/verify', { code: code.data.devCode }, reg.data.token);
    return reg.data.token;
  };
  const stop = async () => {
    server.kill();
    await mongoose.disconnect();
    await mongod.stop();
  };
  return { call, signUp, stop, uri };
}
