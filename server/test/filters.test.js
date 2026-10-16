// Unit tests for the candidate filters and match score (no database needed).
// Run: npm test  (from the server folder)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedFilters, filterScore, fixRole, hasFilters, normalizeFilters, roleTitles, validateFilters } from '../src/utils/candidates.js';

const ALL_SKILLS = ['HTML', 'CSS', 'JavaScript', 'React'];
const full = { role: 'Web Developer', location: 'Rajasthan', minExp: 1, maxExp: 4, minSalary: 3, maxSalary: 7, workModes: 'onsite', notice: 'Immediate', skills: ALL_SKILLS.join(',') };
const good = { headline: 'Web Developer', location: 'Jaipur', experienceYears: 3, expectedSalary: 5, noticePeriod: 'Immediate', workModes: ['onsite'], skills: ALL_SKILLS };

test('normalize: empty input gives empty filters, never throws', () => {
  const f = normalizeFilters();
  assert.deepEqual(f, { role: '', location: '', minExp: null, maxExp: null, minSalary: null, maxSalary: null, workModes: [], notice: [], skills: [] });
  assert.equal(hasFilters(f), false);
  assert.deepEqual(normalizeFilters({ minExp: null, maxExp: '', location: null, skills: [], notice: null }).skills, []);
});

test('normalize: All India, rupees, lists, unknown values dropped', () => {
  const f = normalizeFilters({ location: ' all india ', minSalary: '600000', workMode: 'onsite', workModes: ['remote', 'bogus'], notice: 'Immediate,soon', skills: 'React, ,Node.js' });
  assert.equal(f.location, 'All India');
  assert.equal(f.minSalary, 6);
  assert.deepEqual(f.workModes.sort(), ['onsite', 'remote']);
  assert.deepEqual(f.notice, ['Immediate']);
  assert.deepEqual(f.skills, ['React', 'Node.js']);
  assert.equal(hasFilters(f), true);
});

test('validate: min > max, negative and non-numbers give a clear message', () => {
  assert.match(validateFilters(normalizeFilters({ minExp: 5, maxExp: 2 })), /Min experience/);
  assert.match(validateFilters(normalizeFilters({ minSalary: 9, maxSalary: 3 })), /Min salary/);
  assert.match(validateFilters(normalizeFilters({ minExp: -1 })), /Experience/);
  assert.match(validateFilters(normalizeFilters({ maxSalary: 'abc' })), /Salary/);
  assert.equal(validateFilters(normalizeFilters(full)), null);
});

test('location: empty city and All India add no location rule; a city or state does', () => {
  assert.deepEqual(feedFilters({ role: '', location: '' }), {});
  assert.deepEqual(feedFilters({ location: 'All India' }), {});
  const state = JSON.stringify(feedFilters({ location: 'Rajasthan' }), (k, v) => (v instanceof RegExp ? v.source : v));
  for (const city of ['Jaipur', 'Sikar', 'Kota', 'Jodhpur']) assert.ok(state.includes(city), city);
});

test('location: remote-open people count from anywhere only when Remote is wanted', () => {
  const remote = JSON.stringify(feedFilters({ location: 'Jaipur', workModes: 'remote' }));
  const onsite = JSON.stringify(feedFilters({ location: 'Jaipur', workModes: 'onsite' }));
  assert.ok(remote.includes('"workModes":"remote"'));
  assert.ok(!onsite.includes('"workModes":"remote"'));
});

test('role: short forms, prefixes and small typos are understood', () => {
  assert.equal(fixRole('web dev'), 'web developer');
  assert.equal(fixRole('Frontend Develper'), 'frontend developer');
  assert.equal(fixRole('acountant'), 'accountant');
  assert.equal(fixRole('Senior Java Dev'), 'java developer');
  assert.equal(fixRole('Kotlin Developer'), 'kotlin developer'); // unusual but real words stay
});

test('role: groups, aliases and no leaking between groups', () => {
  const web = roleTitles('Website Developer');
  assert.ok(web.includes('frontend developer') && web.includes('backend developer') && web.includes('full stack developer'));
  const front = roleTitles('Frontend Developer');
  assert.ok(!front.includes('backend developer'), 'frontend must not pull in backend');
  assert.ok(roleTitles('Mobile Developer').includes('react native developer'));
});

test('score: everything matching is 100', () => {
  assert.equal(filterScore(good, full), 100);
});

test('score: a candidate with every field missing is scored, never hidden or crashing', () => {
  const s = filterScore({}, full);
  assert.equal(typeof s, 'number');
  assert.ok(s > 0 && s < 100, String(s));
  assert.equal(filterScore({ headline: null, skills: null, workModes: null }, full) >= 0, true);
});

test('score: unknown experience is neutral, not treated as a fresher', () => {
  const unknown = filterScore({ ...good, experienceYears: null }, full);
  const fresher = filterScore({ ...good, experienceYears: 0 }, full);
  assert.ok(unknown > fresher, `${unknown} > ${fresher}`);
});

test('score: experience inside the range, then more, then less', () => {
  const inside = filterScore({ ...good, experienceYears: 3 }, full);
  const more = filterScore({ ...good, experienceYears: 7 }, full);
  const less = filterScore({ ...good, experienceYears: 0 }, full);
  assert.ok(inside > more && more > less, `${inside} ${more} ${less}`);
});

test('score: salary range overlap counts as inside the budget', () => {
  assert.equal(filterScore({ ...good, expectedSalary: 4, expectedSalaryMax: 8 }, { minSalary: 6, maxSalary: 7 }), 100);
  const inside = filterScore({ ...good, expectedSalary: 5 }, full);
  const less = filterScore({ ...good, expectedSalary: 2 }, full);
  const more = filterScore({ ...good, expectedSalary: 12 }, full);
  assert.ok(inside > less && less > more, `${inside} ${less} ${more}`);
});

test('score: more of the wanted skills ranks higher; skills match ignores case', () => {
  const all = filterScore(good, { skills: 'html,css,javascript,react' });
  const half = filterScore({ ...good, skills: ['HTML', 'CSS'] }, { skills: 'html,css,javascript,react' });
  const none = filterScore({ ...good, skills: [] }, { skills: 'html,css,javascript,react' });
  assert.deepEqual([all, half, none], [100, 50, 0]);
});

test('score: notice Immediate > 15 > 30 > 60 > 90 days; unknown is in the middle', () => {
  const s = (n) => filterScore({ ...good, noticePeriod: n }, { notice: 'Immediate' });
  const order = ['Immediate', '15 days', '30 days', '60 days', '90 days'].map(s);
  assert.deepEqual([...order].sort((a, b) => b - a), order);
  assert.ok(s(undefined) < s('15 days') && s(undefined) > s('90 days'));
});

test('score: work mode match, no preference, other', () => {
  const s = (m) => filterScore({ ...good, workModes: m }, { workModes: 'onsite,hybrid' });
  assert.ok(s(['hybrid']) > s([]) && s([]) > s(['remote']));
});

test('score: no ranking filters set -> no score (feed keeps its own order)', () => {
  assert.equal(filterScore(good, { role: '', location: 'Jaipur' }), null);
});
