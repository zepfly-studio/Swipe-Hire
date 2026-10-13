export { ROLES, SKILLS, DEGREES } from '../../../shared/taxonomy.js';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();

// True when every letter of `term` appears in `word` in order and both start
// with the same letter, so typos like "engner" or "devlopr" still match.
function looseMatch(word, term) {
  if (term.length < 3 || word[0] !== term[0]) return false;
  let i = 0;
  for (const ch of word) if (ch === term[i]) i++;
  return i === term.length;
}

// Lists above are ordered most-popular first; that order breaks ties.
export function searchOptions(options, query, { exclude = [], limit = 10 } = {}) {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(' ');
  const skip = new Set(exclude.map((s) => s.toLowerCase()));

  const scored = [];
  options.forEach((option, index) => {
    if (skip.has(option.toLowerCase())) return;
    const o = normalize(option);
    const words = o.split(' ');
    let score = 0;
    if (o === q) score = 3;
    else if (terms.every((t) => words.some((w) => w.startsWith(t)))) score = 2;
    else if (o.includes(q) || terms.every((t) => words.some((w) => looseMatch(w, t)))) score = 1;
    if (score) scored.push({ score, index, option });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.option);
}
