// "Forgot password" end to end on a throw-away database. Run: npm test
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { startTestApi } from './helpers.js';

let api;
let oldToken;
before(async () => {
  api = await startTestApi(5098);
  oldToken = await api.signUp('Reset Person', 'reset@auth.test', 'candidate', 'old-pass1');
});
after(() => api?.stop());

test('asking for a code answers the same whether the account exists or not', async () => {
  const known = await api.call('POST', '/auth/password/forgot', { email: 'RESET@auth.test ' });
  const unknown = await api.call('POST', '/auth/password/forgot', { email: 'nobody@auth.test' });
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.equal(known.data.message, unknown.data.message);
  assert.match(known.data.devCode, /^\d{6}$/, 'testing mode shows the code');
  assert.equal(unknown.data.devCode, undefined, 'no code for an unknown email');
  const bad = await api.call('POST', '/auth/password/forgot', { email: 'not-an-email' });
  assert.equal(bad.status, 400);
});

test('wrong code is refused and counted; 5 wrong tries lock the code', async () => {
  await User.updateOne({ email: 'reset@auth.test' }, { $unset: { resetOtp: 1 } });
  await api.call('POST', '/auth/password/forgot', { email: 'reset@auth.test' });
  for (let i = 0; i < 5; i++) {
    const r = await api.call('POST', '/auth/password/reset', { email: 'reset@auth.test', code: '000000', password: 'new-pass1' });
    assert.equal(r.status, 400);
  }
  const locked = await api.call('POST', '/auth/password/reset', { email: 'reset@auth.test', code: '000000', password: 'new-pass1' });
  assert.equal(locked.status, 429);
});

test('right code sets the new password, signs in and ends old logins', async () => {
  await User.updateOne({ email: 'reset@auth.test' }, { $unset: { resetOtp: 1 } });
  const sent = await api.call('POST', '/auth/password/forgot', { email: 'reset@auth.test' });
  const short = await api.call('POST', '/auth/password/reset', { email: 'reset@auth.test', code: sent.data.devCode, password: '123' });
  assert.equal(short.status, 400, 'password too short');
  const r = await api.call('POST', '/auth/password/reset', { email: 'reset@auth.test', code: sent.data.devCode, password: 'new-pass1' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(r.data.token && r.data.user.email === 'reset@auth.test');
  assert.equal((await api.call('GET', '/auth/me', undefined, oldToken)).status, 401, 'old login ended');
  assert.equal((await api.call('POST', '/auth/login', { email: 'reset@auth.test', password: 'old-pass1' })).status, 401);
  assert.equal((await api.call('POST', '/auth/login', { email: 'reset@auth.test', password: 'new-pass1' })).status, 200);
  const again = await api.call('POST', '/auth/password/reset', { email: 'reset@auth.test', code: sent.data.devCode, password: 'other-pass1' });
  assert.equal(again.status, 400, 'a code works only once');
});

test('deleting your own account needs the right password', async () => {
  const token = await api.signUp('Leaving Person', 'leave@auth.test', 'candidate', 'leave-pass1');
  const wrong = await api.call('DELETE', '/account', { password: 'nope' }, token);
  assert.equal(wrong.status, 400);
  const ok = await api.call('DELETE', '/account', { password: 'leave-pass1' }, token);
  assert.equal(ok.status, 200);
  assert.equal(await User.exists({ email: 'leave@auth.test' }), null);
  assert.equal((await api.call('POST', '/auth/login', { email: 'leave@auth.test', password: 'leave-pass1' })).status, 401);
});
