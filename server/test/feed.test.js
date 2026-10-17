// Integration test of the company swipe feed: a real API server on a throw-away in-memory
// MongoDB (your local and live data are never touched, and no email is sent).
// Run: npm test  (from the server folder)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { CandidateProfile } from '../src/models/CandidateProfile.js';
import { startTestApi } from './helpers.js';

let api;
let token;
const ids = {}; // letter -> candidate user id
const call = (method, url, body) => api.call(method, url, body, token);

// Candidates straight into the database (the feed only reads live, finished profiles).
const SKILLS = ['HTML', 'CSS', 'JavaScript', 'React'];
const PEOPLE = {
  A: { headline: 'Web Developer', location: 'Sikar', experienceYears: 3, expectedSalary: 5, noticePeriod: 'Immediate', workModes: ['onsite'], skills: SKILLS },
  B: { headline: 'Frontend Developer', location: 'Kota', experienceYears: 3, expectedSalary: 5, noticePeriod: '15 days', workModes: ['onsite'], skills: ['HTML'] },
  C: { headline: 'Web Developer', location: 'Jodhpur', experienceYears: 7, expectedSalary: 6, noticePeriod: 'Immediate', workModes: ['onsite'], skills: SKILLS },
  D: { headline: 'Backend Developer', location: 'Jaipur', experienceYears: 2, expectedSalary: 12, noticePeriod: '90 days', workModes: ['remote'], skills: ['Java'] },
  E: { headline: 'Web Developer', location: 'Mumbai', experienceYears: 3, expectedSalary: 5, noticePeriod: 'Immediate', workModes: ['onsite'], skills: SKILLS },
  F: { headline: 'Accountant', location: 'Jaipur', experienceYears: 3, expectedSalary: 5, skills: ['Tally'] },
  N: { headline: 'Web Developer', location: 'Ajmer' }, // every optional field left empty
  R: { headline: 'Web Developer', location: 'Delhi', experienceYears: 3, expectedSalary: 5, workModes: ['remote'], skills: SKILLS },
  S: { headline: 'Web Developer', location: 'Jaipur', experienceYears: 3, currentSalary: 9, expectedSalary: 10, skills: SKILLS },
};
before(async () => {
  api = await startTestApi(5099);
  for (const [letter, p] of Object.entries(PEOPLE)) {
    const u = await User.create({ name: `Cand ${letter}`, email: `cand-${letter.toLowerCase()}@feed.test`, password: 'x'.repeat(60), role: 'candidate', emailVerified: true });
    await CandidateProfile.create({ user: u._id, step: 3, ...p });
    ids[letter] = String(u._id);
  }
  token = await api.signUp('Feed Co', 'hr@feed.test', 'company');
  await call('PUT', '/company/profile', { companyName: 'Feed Co', industry: 'IT / Software', companySize: '11–50', location: 'Jaipur', phone: '9876543210', contactEmail: 'hr@feed.test' });
});

after(() => api?.stop());

const letters = (cards) => cards.map((c) => Object.keys(ids).find((k) => ids[k] === c.id)).join('');
const feed = async (q, exclude = []) => {
  const r = await call('GET', `/company/feed?${new URLSearchParams({ limit: 30, ...q, exclude: exclude.join(',') })}`);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
};
const FULL = { role: 'Web Developer', location: 'Rajasthan', minExp: 1, maxExp: 4, minSalary: 3, maxSalary: 7, workModes: 'onsite', notice: 'Immediate', skills: SKILLS.join(',') };

test('role + city decide who shows; the rest only orders them', async () => {
  const d = await feed(FULL);
  const L = letters(d.candidates);
  assert.equal(L[0], 'A', L); // matches everything
  for (const x of 'ABCDN') assert.ok(L.includes(x), `${x} missing from ${L}`);
  assert.ok(!L.includes('E'), 'Mumbai is not in Rajasthan');
  assert.ok(!L.includes('F'), 'an accountant is not a web developer');
  assert.ok(!L.includes('S'), 'already earns more than the budget');
  assert.ok(L.indexOf('C') < L.indexOf('D'), 'weakest match comes last');
  const scores = d.candidates.map((c) => c.matchScore);
  assert.deepEqual([...scores].sort((a, b) => b - a), scores, 'sorted by match %');
});

test('a candidate with empty fields is shown, not hidden', async () => {
  const d = await feed(FULL);
  const n = d.candidates.find((c) => c.id === ids.N);
  assert.ok(n && n.matchScore > 0, JSON.stringify(n));
});

test('short / misspelt role still finds people', async () => {
  assert.ok(letters((await feed({ role: 'web dev', location: 'Rajasthan' })).candidates).includes('A'));
  assert.ok(letters((await feed({ role: 'Website Develper', location: 'All India' })).candidates).includes('E'));
});

test('empty city and All India mean anywhere', async () => {
  assert.ok(letters((await feed({ role: 'Web Developer', location: 'All India' })).candidates).includes('E'));
  assert.ok(letters((await feed({ role: 'Web Developer' })).candidates).includes('E'));
});

test('remote-open people from other cities show when Remote is wanted', async () => {
  assert.ok(letters((await feed({ role: 'Web Developer', location: 'Jaipur', workModes: 'remote' })).candidates).includes('R'));
  assert.ok(!letters((await feed({ role: 'Web Developer', location: 'Jaipur', workModes: 'onsite' })).candidates).includes('R'));
});

test('bad filters get a clear 400', async () => {
  const r = await call('GET', '/company/feed?role=Web%20Developer&minExp=5&maxExp=2');
  assert.equal(r.status, 400);
  assert.match(r.data.message, /Min experience/);
  const neg = await call('GET', '/company/feed?role=Web%20Developer&minSalary=-3');
  assert.equal(neg.status, 400);
});

test('pages never repeat a card and keep the same order', async () => {
  const q = { role: 'Web Developer', location: 'All India', limit: 2 };
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const d = await feed(q, seen);
    if (!d.candidates.length) break;
    for (const c of d.candidates) assert.ok(!seen.includes(c.id), 'repeated card');
    seen.push(...d.candidates.map((c) => c.id));
  }
  const once = letters((await feed({ ...q, limit: 30 })).candidates);
  assert.equal(seen.map((id) => Object.keys(ids).find((k) => ids[k] === id)).join(''), once);
});

test('already swiped candidates never come back, under any filters', async () => {
  const d = await feed(FULL);
  const r = await call('POST', '/company/swipe', { candidateId: ids.A, action: 'left', jobId: d.job.id });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.ok(!letters((await feed(FULL)).candidates).includes('A'));
  assert.ok(!letters((await feed({ role: 'Web Developer', location: 'All India' })).candidates).includes('A'));
  const again = await call('POST', '/company/swipe', { candidateId: ids.A, action: 'right', jobId: d.job.id });
  assert.equal(again.status, 409);
});
