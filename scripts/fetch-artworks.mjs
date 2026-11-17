// Downloads artwork details from the Art Institute of Chicago API into data/artworks.json.
// Run with: node scripts/fetch-artworks.mjs
// Edit GALLERIES to change which pieces hang in each room. `featured: false` marks filler pieces.

import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const GALLERIES = [
  { id: 'oldmasters', name: 'Old Masters', works: [
    { id: 15468, scale: 1.3 }, { id: 5848, scale: 1.15 }, { id: 144969 } ] },
  { id: 'impressionism', name: 'Impressionism', works: [
    { id: 27992, scale: 1.45 }, { id: 20684, scale: 1.35 }, { id: 61603, scale: 0.7 }, { id: 64818 }, { id: 16568 }, { id: 80607, scale: 0.8 } ] },
  { id: 'okeeffe', name: "O'Keeffe Room", works: [
    { id: 24306 }, { id: 61428 }, { id: 100858, scale: 1.7 } ] },
  { id: 'modern', name: 'Modern & Abstract', works: [
    { id: 119521 }, { id: 28067 }, { id: 129884 }, { id: 86385, scale: 1.2 } ] },
  { id: 'japanese', name: 'Japanese Prints', works: [
    { id: 24645, scale: 0.8 }, { id: 87008, scale: 0.7, featured: false }, { id: 10926, scale: 0.7, featured: false }, { id: 13405, scale: 0.7, featured: false } ] },
  { id: 'american', name: 'American Life', works: [
    { id: 111628, scale: 1.3 }, { id: 117266, scale: 1.1 }, { id: 102234, scale: 1.2 }, { custom: 'soir-bleu', scale: 1.2 } ] },
];

// Pieces that aren't in the Art Institute's collection. Their image must already be in images/<id>.jpg.
const CUSTOM = {
  'soir-bleu': {
    id: 'soir-bleu',
    title: 'Soir Bleu',
    artist: 'Edward Hopper',
    artistDisplay: 'Edward Hopper (American, 1882–1967)',
    date: '1914',
    medium: 'Oil on canvas',
    dimensions: '91.4 × 182.9 cm (36 × 72 in.)',
    place: null,
    credit: 'Whitney Museum of American Art, New York; Josephine N. Hopper Bequest',
    description: 'Soir Bleu ("Blue Evening") was painted in 1914, a few years after Hopper returned from Paris. On a café terrace under paper lanterns, a sad clown smokes among a cast of characters: a heavily made-up woman standing over the tables, an officer, a man in a beret and a fashionable couple. The painting was poorly received when Hopper showed it in 1915, and it stayed with him for the rest of his life. It came to the Whitney Museum as part of the bequest of his wife, the artist Josephine Nivison Hopper.',
    imageId: null,
    publicDomain: false,
    aspect: 2.01,
    lqip: null,
    note: 'On loan from the Whitney',
    link: 'https://whitney.org/collection/works?q=Soir%20Bleu',
    linkLabel: 'Find it on whitney.org ↗',
    image: 'images/soir-bleu.jpg',
  },
};

const UA = 'miniature-museum (personal art website prototype)';
const FIELDS = ['id', 'title', 'artist_display', 'artist_title', 'date_display', 'medium_display', 'dimensions',
  'description', 'short_description', 'place_of_origin', 'credit_line', 'image_id', 'thumbnail', 'is_public_domain'];

const toText = (html) => String(html || '')
  .replace(/<\/p>\s*/g, '\n\n').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'")
  .replace(/\n{3,}/g, '\n\n').trim();

const ids = GALLERIES.flatMap((g) => g.works.filter((w) => w.id).map((w) => w.id));
const url = `https://api.artic.edu/api/v1/artworks?ids=${ids.join(',')}&fields=${FIELDS.join(',')}&limit=100`;
const res = await fetch(url, { headers: { 'AIC-User-Agent': 'miniature-museum (prototype)' } });
if (!res.ok) throw new Error(`API returned ${res.status}`);
const byId = new Map((await res.json()).data.map((a) => [a.id, a]));

const out = {
  source: 'Art Institute of Chicago API (api.artic.edu). Descriptions are CC BY 4.0; other data CC0.',
  galleries: GALLERIES.map((g) => ({
    id: g.id,
    name: g.name,
    works: g.works.map((w) => {
      if (w.custom) return { ...CUSTOM[w.custom], scale: w.scale || 1, featured: w.featured !== false };
      const a = byId.get(w.id);
      if (!a) throw new Error(`Artwork ${w.id} not found`);
      return {
        id: a.id,
        title: a.title,
        artist: a.artist_title,
        artistDisplay: a.artist_display,
        date: a.date_display,
        medium: a.medium_display,
        dimensions: a.dimensions,
        place: a.place_of_origin,
        credit: a.credit_line,
        description: toText(a.description) || toText(a.short_description),
        imageId: a.image_id,
        image: `images/${a.id}.jpg`,
        link: `https://www.artic.edu/artworks/${a.id}`,
        publicDomain: a.is_public_domain,
        aspect: a.thumbnail ? +(a.thumbnail.width / a.thumbnail.height).toFixed(3) : 1,
        lqip: a.thumbnail?.lqip || null,
        scale: w.scale || 1,
        featured: w.featured !== false,
      };
    }),
  })),
};

await writeFile(new URL('../data/artworks.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`Saved ${ids.length} artworks to data/artworks.json`);

// Save each image into images/ so the site serves them itself
// (the museum's image server doesn't allow other websites to embed them).
await mkdir(new URL('../images/', import.meta.url), { recursive: true });
for (const w of out.galleries.flatMap((g) => g.works)) {
  if (!w.imageId) continue;
  {
    // curl is used because the image server refuses Node's built-in fetch, and only the
    // standard 843px width is allowed (other sizes return 403).
    const file = fileURLToPath(new URL(`../images/${w.id}.jpg`, import.meta.url));
    execFileSync('curl', ['-sSf', '--retry', '2', '-o', file, `https://www.artic.edu/iiif/2/${w.imageId}/full/843,/0/default.jpg`]);
  }
  process.stdout.write('.');
}
console.log(' images saved');
