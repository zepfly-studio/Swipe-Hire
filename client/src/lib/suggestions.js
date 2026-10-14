import { CITIES, STATES } from '../../../shared/taxonomy.js';

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
// minScore 2 keeps only names where a word starts with what was typed.
export function searchOptions(options, query, { exclude = [], limit = 10, minScore = 1 } = {}) {
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
    if (o === q) score = 4;
    // "pu" -> Pune before Kanpur Uttar…: a match at the very start ranks above a later word.
    else if (o.startsWith(q)) score = 3;
    else if (terms.every((t) => words.some((w) => w.startsWith(t)))) score = 2;
    else if (o.includes(q) || terms.every((t) => words.some((w) => looseMatch(w, t)))) score = 1;
    if (score >= minScore) scored.push({ score, index, option });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.option);
}

// Location suggestions: up to 7 cities plus up to 3 states, so a short query like "j"
// shows Jaipur, Jodhpur… and also Jharkhand instead of only cities.
export function searchLocations(query, { exclude = [] } = {}) {
  const find = (minScore) => {
    const states = searchOptions(STATES, query, { exclude, limit: 3, minScore });
    const cities = searchOptions(CITIES, query, { exclude, limit: 10 - states.length, minScore });
    return [...cities, ...states];
  };
  // Names starting with what was typed; looser matches (typos, middle of a word) only if none.
  const strict = find(2);
  return strict.length ? strict : find(1);
}
