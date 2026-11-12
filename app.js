'use strict';

// ---------- Options (values are what Spoonacular expects) ----------
const OPTIONS = {
  cuisine: ['African', 'American', 'British', 'Cajun', 'Caribbean', 'Chinese', 'Eastern European', 'French',
    'German', 'Greek', 'Indian', 'Irish', 'Italian', 'Japanese', 'Jewish', 'Korean', 'Latin American',
    'Mediterranean', 'Mexican', 'Middle Eastern', 'Nordic', 'Southern', 'Spanish', 'Thai', 'Vietnamese'],
  intolerances: ['Dairy', 'Egg', 'Gluten', 'Grain', 'Peanut', 'Seafood', 'Sesame', 'Shellfish', 'Soy',
    'Sulfite', 'Tree Nut', 'Wheat'],
  diet: ['Vegetarian', 'Vegan', 'Pescetarian', 'Ketogenic', 'Paleo'],
  budget: [
    { label: 'Under $2', value: '200' },
    { label: 'Under $4', value: '400' },
    { label: 'Under $6', value: '600' },
  ],
};
const MULTI = { cuisine: true, intolerances: true, diet: false, budget: false };
const FILTER_NAMES = { cuisine: 'Cuisine', intolerances: 'Allergies', diet: 'Diet', budget: 'Budget' };

const WHEEL = ['Italian', 'Mexican', 'Japanese', 'Indian', 'Thai', 'Chinese', 'French', 'Greek', 'Korean',
  'Mediterranean', 'American', 'Middle Eastern'];
const WHEEL_COLORS = ['#f4a259', '#e76f51', '#8ab17d', '#2a9d8f', '#e9c46a', '#bc4b51', '#5b8e7d', '#f28482',
  '#84a59d', '#f6bd60', '#6d9dc5', '#c08497'];

const FRIDGE_SUGGESTIONS = ['eggs', 'rice', 'chicken', 'pasta', 'tomatoes', 'onion', 'garlic', 'cheese',
  'spinach', 'potatoes', 'bell pepper', 'tofu'];
const MOODS = ['ramen', 'something cheesy', 'tacos', 'a cozy soup', 'pancakes', 'curry', 'a big salad', 'pizza'];

// ---------- Small helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c);
  return node;
};
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const money = (cents) => (cents == null ? null : `$${(cents / 100).toFixed(2)}`);
const optLabel = (key, value) => (key === 'budget' ? OPTIONS.budget.find((o) => o.value === value)?.label : value);

// ---------- API ----------
const cache = new Map();
async function api(params, { useCache = true } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  if (useCache && cache.has(qs)) return cache.get(qs);
  let res, data;
  try {
    res = await fetch(`/api/spoonacular?${qs}`);
    data = await res.json();
  } catch {
    throw new ApiError('network', "Couldn't reach the recipe service. Check your connection and try again.");
  }
  if (!res.ok) throw new ApiError(data.error, data.message);
  if (useCache) cache.set(qs, data);
  return data;
}
class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function showError(statusEl, err) {
  const banner = $('#banner');
  if (err.code === 'missing_key' || err.code === 'bad_key') {
    banner.textContent = 'This site needs a Spoonacular API key. In Vercel, add SPOONACULAR_API_KEY under Settings → Environment Variables, then redeploy.';
    banner.hidden = false;
    statusEl.textContent = '';
  } else if (err.code === 'quota') {
    statusEl.textContent = "We've hit today's free recipe limit. Try again tomorrow!";
  } else {
    statusEl.textContent = err.message || 'Something went wrong. Try again.';
  }
}

// ---------- Filters ----------
const filters = Object.assign({ cuisine: [], intolerances: [], diet: [], budget: [] }, store.get('mf.filters', {}));

function filterParams() {
  return {
    cuisine: filters.cuisine.join(','),
    intolerances: filters.intolerances.join(','),
    diet: filters.diet.join(',').toLowerCase(),
    maxPrice: filters.budget[0],
  };
}

function renderFilters() {
  for (const box of document.querySelectorAll('.filter')) {
    const key = box.dataset.filter;
    const chips = $('.chips', box);
    chips.replaceChildren(...OPTIONS[key].map((opt) => {
      const value = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      const on = filters[key].includes(value);
      return el('button', {
        type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': String(on),
        onclick: () => toggleFilter(key, value),
      }, label);
    }));
    const n = filters[key].length;
    $('.count', box).textContent = n ? (MULTI[key] ? n : '•') : '';
    box.classList.toggle('active', n > 0);
  }

  const active = Object.keys(filters).flatMap((key) => filters[key].map((value) =>
    el('button', { type: 'button', class: 'chip on small', onclick: () => toggleFilter(key, value),
      'aria-label': `Remove ${FILTER_NAMES[key]}: ${optLabel(key, value)}` },
    `${key === 'intolerances' ? 'No ' : ''}${optLabel(key, value)} ×`)));
  if (active.length) active.push(el('button', { type: 'button', class: 'link', onclick: clearFilters }, 'Clear filters'));
  $('#active-filters').replaceChildren(...active);
}

function toggleFilter(key, value) {
  const list = filters[key];
  if (list.includes(value)) filters[key] = list.filter((v) => v !== value);
  else filters[key] = MULTI[key] ? [...list, value] : [value];
  store.set('mf.filters', filters);
  renderFilters();
}
function clearFilters() {
  for (const k of Object.keys(filters)) filters[k] = [];
  store.set('mf.filters', filters);
  renderFilters();
}

function closePanels(except) {
  for (const box of document.querySelectorAll('.filter')) {
    if (box === except) continue;
    $('.panel', box).hidden = true;
    $('.filter-btn', box).setAttribute('aria-expanded', 'false');
  }
}
document.querySelectorAll('.filter').forEach((box) => {
  $('.filter-btn', box).addEventListener('click', () => {
    const panel = $('.panel', box);
    closePanels(box);
    panel.hidden = !panel.hidden;
    $('.filter-btn', box).setAttribute('aria-expanded', String(!panel.hidden));
  });
});
// composedPath() is captured when the click starts, so it still works after a chip re-renders.
document.addEventListener('click', (e) => {
  if (!e.composedPath().some((n) => n.classList && n.classList.contains('filter'))) closePanels();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });

// ---------- Recipe cards ----------
function recipeCard(r, extra) {
  const meta = [r.readyInMinutes && `${r.readyInMinutes} min`, money(r.pricePerServing) && `${money(r.pricePerServing)}/serving`]
    .filter(Boolean).join(' · ');
  return el('button', { type: 'button', class: 'card', onclick: () => openRecipe(r.id) },
    el('div', { class: 'card-img' }, r.image ? el('img', { src: r.image, alt: '', loading: 'lazy' }) : null),
    el('div', { class: 'card-body' },
      el('h3', {}, r.title),
      meta ? el('p', { class: 'meta' }, meta) : null,
      extra || null));
}

// ---------- 1. Search ----------
const searchInput = $('#search-input');
let moodIndex = 0;
setInterval(() => {
  if (document.activeElement === searchInput || searchInput.value) return;
  moodIndex = (moodIndex + 1) % MOODS.length;
  searchInput.placeholder = MOODS[moodIndex];
}, 2500);

$('#search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  closePanels();
  const status = $('#search-status');
  const grid = $('#search-results');
  document.body.classList.add('has-results');
  status.textContent = 'Finding recipes…';
  grid.replaceChildren();
  try {
    const data = await api({ action: 'search', query: searchInput.value.trim(), number: 24, ...filterParams() });
    if (!data.results.length) {
      status.textContent = 'No recipes matched. Try fewer filters or a different word.';
      return;
    }
    status.textContent = `${data.results.length} recipe${data.results.length === 1 ? '' : 's'}`;
    grid.replaceChildren(...data.results.map((r) => recipeCard(r)));
  } catch (err) {
    showError(status, err);
  }
});

// ---------- 2. Fridge ----------
let fridge = store.get('mf.fridge', []);

function renderFridge() {
  $('#fridge-tags').replaceChildren(...fridge.map((item) =>
    el('span', { class: 'tag' }, item,
      el('button', { type: 'button', 'aria-label': `Remove ${item}`, onclick: () => removeIngredient(item) }, '×'))));
  $('#fridge-suggest').replaceChildren(...FRIDGE_SUGGESTIONS.filter((s) => !fridge.includes(s)).map((s) =>
    el('button', { type: 'button', class: 'chip small', onclick: () => addIngredient(s) }, `+ ${s}`)));
  $('#fridge-go').disabled = fridge.length === 0;
  store.set('mf.fridge', fridge);
}
function addIngredient(raw) {
  for (const part of raw.split(',')) {
    const item = part.trim().toLowerCase();
    if (item && !fridge.includes(item)) fridge.push(item);
  }
  renderFridge();
}
function removeIngredient(item) {
  fridge = fridge.filter((i) => i !== item);
  renderFridge();
}

$('#fridge-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#fridge-input');
  addIngredient(input.value);
  input.value = '';
  input.focus();
});
$('#fridge-clear').addEventListener('click', () => {
  fridge = [];
  renderFridge();
  $('#fridge-results').replaceChildren();
  $('#fridge-status').textContent = '';
});
$('#fridge-go').addEventListener('click', async () => {
  const status = $('#fridge-status');
  const grid = $('#fridge-results');
  status.textContent = 'Checking your fridge…';
  grid.replaceChildren();
  try {
    const data = await api({ action: 'fridge', ingredients: fridge.join(','), number: 24 });
    if (!data.results.length) {
      status.textContent = 'No recipes found. Try adding a few more ingredients.';
      return;
    }
    status.textContent = 'Best matches first';
    grid.replaceChildren(...data.results.map((r) => recipeCard(r, el('div', { class: 'fridge-meta' },
      el('p', { class: 'uses' }, `Uses ${r.usedCount} of your ingredients`),
      r.missed.length ? el('p', { class: 'missing' }, `Missing: ${r.missed.join(', ')}`) : el('p', { class: 'uses' }, 'You have everything!')))));
  } catch (err) {
    showError(status, err);
  }
});

// ---------- 3. Spin the wheel ----------
const wheel = $('#wheel');
let rotation = 0;
let spinning = false;

function drawWheel() {
  const n = WHEEL.length;
  const slice = (2 * Math.PI) / n;
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  WHEEL.forEach((name, i) => {
    // Slice i is centered at the top (12 o'clock) when the wheel is rotated by -i * slice.
    const a0 = i * slice - slice / 2 - Math.PI / 2;
    const a1 = a0 + slice;
    const r = 96;
    const path = make('path', {
      d: `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`,
      fill: WHEEL_COLORS[i % WHEEL_COLORS.length],
      stroke: '#fff',
      'stroke-width': '1',
    });
    const mid = (a0 + a1) / 2;
    const deg = (mid * 180) / Math.PI;
    const text = make('text', {
      x: '58', y: '0', transform: `rotate(${deg})`, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      class: 'wheel-label',
    });
    text.textContent = name;
    wheel.append(path, text);
  });
  wheel.append(make('circle', { r: '18', fill: 'var(--surface)', stroke: 'var(--border)' }));
}

$('#spin-btn').addEventListener('click', () => {
  if (spinning) return;
  spinning = true;
  $('#spin-btn').disabled = true;
  const n = WHEEL.length;
  const sliceDeg = 360 / n;
  const pick = Math.floor(Math.random() * n);
  const jitter = (Math.random() - 0.5) * sliceDeg * 0.7;
  // Land with slice `pick` under the pointer at the top.
  const current = ((rotation % 360) + 360) % 360;
  const target = (360 - pick * sliceDeg + jitter + 360) % 360;
  rotation += 360 * 5 + ((target - current + 360) % 360);
  wheel.style.transform = `rotate(${rotation}deg)`;
  $('#spin-status').textContent = 'Spinning…';
  $('#spin-result').replaceChildren();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => landOn(WHEEL[pick]), reduceMotion ? 50 : 4200);
});

async function landOn(cuisine) {
  const status = $('#spin-status');
  status.textContent = `The wheel says… ${cuisine}! Finding a recipe…`;
  try {
    const extra = $('#spin-use-filters').checked ? filterParams() : {};
    const data = await api({ action: 'search', ...extra, cuisine, sort: 'random', number: 10 }, { useCache: false });
    const r = data.results[0];
    if (!r) {
      status.textContent = `No ${cuisine} recipes matched your filters. Spin again!`;
    } else {
      status.textContent = `The wheel says… ${cuisine}!`;
      $('#spin-result').replaceChildren(recipeCard(r));
    }
  } catch (err) {
    showError(status, err);
  } finally {
    spinning = false;
    $('#spin-btn').disabled = false;
  }
}

// ---------- Recipe detail ----------
const dialog = $('#recipe-dialog');
dialog.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

async function openRecipe(id) {
  const body = $('#recipe-body');
  body.replaceChildren(el('p', { class: 'status' }, 'Loading recipe…'));
  if (!dialog.open) dialog.showModal();
  try {
    const r = await api({ action: 'recipe', id });
    const facts = [
      r.readyInMinutes && `⏱ ${r.readyInMinutes} min`,
      r.servings && `🍽 Serves ${r.servings}`,
      money(r.pricePerServing) && `💲 ${money(r.pricePerServing)} per serving`,
    ].filter(Boolean);
    const tags = [...r.cuisines, ...r.diets];
    body.replaceChildren(
      r.image ? el('img', { class: 'hero-img', src: r.image, alt: '' }) : null,
      el('div', { class: 'recipe-content' },
        el('h2', { id: 'recipe-title' }, r.title),
        facts.length ? el('p', { class: 'facts' }, facts.join('   ')) : null,
        tags.length ? el('div', { class: 'chips' }, tags.map((t) => el('span', { class: 'chip small static' }, t))) : null,
        el('div', { class: 'recipe-cols' },
          el('div', {},
            el('h3', {}, 'Ingredients'),
            el('ul', { class: 'ingredients' }, r.ingredients.map((i) => el('li', {}, i)))),
          el('div', {},
            el('h3', {}, 'Steps'),
            r.steps.length
              ? el('ol', { class: 'steps' }, r.steps.map((s) => el('li', {}, s)))
              : el('p', { class: 'sub' }, 'See the original recipe for the steps.'))),
        r.sourceUrl ? el('p', { class: 'source' },
          el('a', { href: r.sourceUrl, target: '_blank', rel: 'noopener' }, `Original recipe${r.sourceName ? ` from ${r.sourceName}` : ''} ↗`)) : null));
  } catch (err) {
    const p = el('p', { class: 'status' });
    body.replaceChildren(p);
    showError(p, err);
  }
}

// ---------- Router ----------
function route() {
  const name = (location.hash.replace(/^#\/?/, '') || 'search').split('/')[0];
  const view = ['search', 'fridge', 'spin'].includes(name) ? name : 'search';
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.view !== view; });
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('current', a.dataset.route === view));
  document.querySelectorAll('.tabs a').forEach((a) => (a.dataset.route === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.body.dataset.view = view;
  closePanels();
}
window.addEventListener('hashchange', route);

// ---------- Start ----------
renderFilters();
renderFridge();
drawWheel();
route();
