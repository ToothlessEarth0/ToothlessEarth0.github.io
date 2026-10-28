// Checks data/streams.json for mistakes before you commit and push.
// Run with:  node validate.js     (needs Node 18+; no packages to install)

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'data', 'streams.json');
let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`Could not read data/streams.json: ${err.message}`);
  console.error('Common causes: a missing comma between entries, or a trailing comma after the last one.');
  process.exit(1);
}

if (!Array.isArray(data)) {
  console.error('data/streams.json must be a list: it should start with [ and end with ].');
  process.exit(1);
}

// Only these games are allowed. To add another game later, add its exact name here.
const ALLOWED_GAMES = ['Overwatch', 'Deadlock'];

const problems = [];
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

data.forEach((s, i) => {
  const where = `Entry ${i + 1}${s && s.game ? ` (${s.game})` : ''}`;
  const bad = (msg) => problems.push(`${where}: ${msg}`);

  if (!s || typeof s !== 'object') return bad('must be an object { ... }.');
  if (!Array.isArray(s.roles) || s.roles.length === 0 || !s.roles.every(isText)) {
    bad('"roles" must be a list with at least one role, e.g. ["Play-by-play", "Host"].');
  } else if (new Set(s.roles).size !== s.roles.length) {
    bad('"roles" contains the same role twice.');
  }
  if (!ALLOWED_GAMES.includes(s.game)) {
    bad(`"game" must be exactly one of: ${ALLOWED_GAMES.join(', ')}.`);
  }
  if (s.event != null && !isText(s.event)) bad('"event" must be text or null.');

  const okDate = typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date)
    && new Date(s.date + 'T00:00:00Z').toISOString().slice(0, 10) === s.date;
  if (!okDate) bad('"date" must be a real date written YYYY-MM-DD, e.g. "2026-10-15".');

  if (s.lengthMins != null && (!Number.isInteger(s.lengthMins) || s.lengthMins < 1 || s.lengthMins > 1440)) {
    bad('"lengthMins" must be a whole number of minutes (1 to 1440), e.g. 135, or null.');
  }

  if (s.vodUrl != null) {
    try {
      const u = new URL(s.vodUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch {
      bad('"vodUrl" must be a full http(s) link, or null.');
    }
  }
});

if (problems.length) {
  console.error(`Found ${problems.length} problem(s):`);
  problems.forEach((p) => console.error(' - ' + p));
  process.exit(1);
}
console.log(`OK: ${data.length} stream(s) look good.`);
