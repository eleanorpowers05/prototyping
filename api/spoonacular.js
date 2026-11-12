// Vercel serverless function: the only place that talks to Spoonacular.
// It adds the secret API key (from the SPOONACULAR_API_KEY environment
// variable), so the key never appears in the website's code.
//
// Usage from the site: /api/spoonacular?action=search|fridge|recipe&...

const BASE = 'https://api.spoonacular.com';
const MAX_RESULTS = 30;

const stripHtml = (s) =>
  String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const card = (r) => ({
  id: r.id,
  title: r.title,
  image: r.image,
  readyInMinutes: r.readyInMinutes,
  servings: r.servings,
  pricePerServing: r.pricePerServing,
  cuisines: r.cuisines || [],
  diets: r.diets || [],
});

const ROUTES = {
  // "I'm in the mood for..." search, and the spin-the-wheel pick (sort=random).
  search: {
    path: () => '/recipes/complexSearch',
    params: ['query', 'cuisine', 'intolerances', 'diet', 'sort', 'sortDirection', 'number', 'offset'],
    fixed: { addRecipeInformation: 'true', instructionsRequired: 'true' },
    prepare(q, url) {
      // Budget isn't a Spoonacular filter, so when one is set, ask for the
      // cheapest matches first and drop anything over the limit below.
      if (q.get('maxPrice') && !q.get('sort')) {
        url.searchParams.set('sort', 'price');
        url.searchParams.set('sortDirection', 'asc');
      }
    },
    shape(data, q) {
      const max = Number(q.get('maxPrice')) || Infinity;
      const results = (data.results || []).filter((r) => (r.pricePerServing ?? 0) <= max).map(card);
      return { results, totalResults: data.totalResults ?? results.length };
    },
    cache: (q) => (q.get('sort') === 'random' ? 0 : 3600),
  },

  // "What's in my fridge?"
  fridge: {
    path: () => '/recipes/findByIngredients',
    params: ['ingredients', 'number'],
    fixed: { ranking: '1', ignorePantry: 'true' },
    shape: (data) => ({
      results: (Array.isArray(data) ? data : []).map((r) => ({
        id: r.id,
        title: r.title,
        image: r.image,
        usedCount: r.usedIngredientCount,
        missedCount: r.missedIngredientCount,
        used: (r.usedIngredients || []).map((i) => i.name),
        missed: (r.missedIngredients || []).map((i) => i.name),
      })),
    }),
    cache: () => 3600,
  },

  // Full recipe for the detail view.
  recipe: {
    validate: (q) => /^\d{1,10}$/.test(q.get('id') || ''),
    path: (q) => `/recipes/${q.get('id')}/information`,
    params: [],
    fixed: { includeNutrition: 'false' },
    shape(r) {
      let steps = (r.analyzedInstructions || []).flatMap((block) => (block.steps || []).map((s) => s.step));
      if (!steps.length && r.instructions) {
        steps = stripHtml(r.instructions.replace(/<\/(li|p)>/g, '\n'))
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return {
        ...card(r),
        summary: stripHtml(r.summary),
        sourceUrl: r.sourceUrl,
        sourceName: r.sourceName,
        dishTypes: r.dishTypes || [],
        ingredients: (r.extendedIngredients || []).map((i) => i.original),
        steps,
      };
    },
    cache: () => 86400,
  },
};

function send(res, status, body, cacheSeconds = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    status === 200 && cacheSeconds ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400` : 'no-store'
  );
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    return send(res, 500, {
      error: 'missing_key',
      message: 'SPOONACULAR_API_KEY is not set in Vercel → Settings → Environment Variables.',
    });
  }

  const q = new URL(req.url, 'http://localhost').searchParams;
  const route = ROUTES[q.get('action')];
  if (!route || (route.validate && !route.validate(q))) {
    return send(res, 400, { error: 'bad_request', message: 'Unknown action or bad parameters.' });
  }

  const url = new URL(BASE + route.path(q));
  for (const p of route.params) {
    const v = q.get(p);
    if (v) url.searchParams.set(p, v.slice(0, 500));
  }
  if (url.searchParams.has('number')) {
    url.searchParams.set('number', String(Math.min(MAX_RESULTS, Math.max(1, Number(url.searchParams.get('number')) || 12))));
  }
  for (const [k, v] of Object.entries(route.fixed)) url.searchParams.set(k, v);
  if (route.prepare) route.prepare(q, url);
  url.searchParams.set('apiKey', key);

  let upstream;
  try {
    upstream = await fetch(url);
  } catch (err) {
    return send(res, 502, { error: 'upstream', message: 'Could not reach Spoonacular.' });
  }

  if (upstream.status === 402) {
    return send(res, 402, { error: 'quota', message: 'The free daily Spoonacular limit has been reached.' });
  }
  if (upstream.status === 401) {
    return send(res, 500, { error: 'bad_key', message: 'Spoonacular rejected the API key.' });
  }
  if (!upstream.ok) {
    return send(res, 502, { error: 'upstream', message: `Spoonacular returned ${upstream.status}.` });
  }

  const data = await upstream.json();
  return send(res, 200, route.shape(data, q), route.cache(q));
};
