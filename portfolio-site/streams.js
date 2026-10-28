// Reads data/streams.json and draws the stream cards.
//
// Used in two places:
//   - streams.html: full log, with filter dropdowns and sorting
//   - index.html:   a short "latest streams" preview (set data-limit on #stream-grid)

(function () {
  const grid = document.getElementById('stream-grid');
  if (!grid) return;

  const limit = Number(grid.dataset.limit) || 0;
  const status = document.getElementById('streams-status');
  const count = document.getElementById('stream-count');
  const filters = {
    role: document.getElementById('filter-role'),
    game: document.getElementById('filter-game'),
    event: document.getElementById('filter-event'),
  };
  const sortSelect = document.getElementById('sort-streams');

  let streams = [];

  // 135 -> "2h 15m"
  function formatLength(mins) {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}m`;
    return h ? `${h}h` : `${m}m`;
  }

  // "2026-10-15" -> "15 Oct 2026"
  function formatDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
  }

  function isHttpUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildCard(s) {
    const card = el('article', 'stream-card');

    // One pill per role, so "Host" + "Play-by-play" shows as two pills
    const roles = el('div', 'stream-roles');
    roles.append(...s.roles.map((r) => el('span', 'stream-role', r)));

    const top = el('div', 'stream-top');
    top.append(roles, el('span', 'stream-date', formatDate(s.date)));

    const meta = el('div', 'stream-meta', formatLength(s.lengthMins) || 'Length not recorded');

    const links = el('div', 'stream-links');
    if (s.vodUrl && isHttpUrl(s.vodUrl)) {
      const a = el('a', '', 'Watch VOD');
      a.href = s.vodUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      links.append(a);
    } else {
      links.append(el('span', 'no-vod', 'VOD not available'));
    }

    card.append(top, el('h3', '', s.game), el('p', 'stream-event', s.event || 'No event listed'), meta, links);
    return card;
  }

  function sorted(list) {
    const [key, order] = (sortSelect ? sortSelect.value : 'date-desc').split('-');
    const dir = order === 'asc' ? 1 : -1;
    const value = {
      date: (s) => s.date,
      length: (s) => s.lengthMins || 0,
      game: (s) => s.game.toLowerCase(),
    }[key] || ((s) => s.date);

    return [...list].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      if (x < y) return -dir;
      if (x > y) return dir;
      return b.date.localeCompare(a.date);
    });
  }

  // A stream can have several roles but only one game and one event
  function valuesOf(s, key) {
    return key === 'role' ? s.roles : [s[key]];
  }

  function render() {
    let list = streams.filter((s) =>
      ['role', 'game', 'event'].every((k) => !filters[k] || !filters[k].value || valuesOf(s, k).includes(filters[k].value))
    );
    const total = list.length;
    list = sorted(list);
    if (limit) list = list.slice(0, limit);

    grid.replaceChildren(...list.map(buildCard));
    status.textContent = total ? '' : 'No streams match those filters.';
    if (count) count.textContent = `${total} stream${total === 1 ? '' : 's'}`;
  }

  function fillFilters() {
    for (const key of ['role', 'game', 'event']) {
      if (!filters[key]) continue;
      const values = [...new Set(streams.flatMap((s) => valuesOf(s, key)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      for (const v of values) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        filters[key].append(opt);
      }
      filters[key].addEventListener('change', render);
    }
    if (sortSelect) sortSelect.addEventListener('change', render);
  }

  fetch('data/streams.json')
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then((data) => {
      streams = data;
      fillFilters();
      render();
    })
    .catch(() => {
      status.textContent = 'Could not load the stream log right now.';
    });
})();
