# The Miniature Museum

A bird's-eye, dollhouse-style museum. Little visitors wander between the galleries and scatter away from your cursor. Click a painting (or use the Guide) to zoom in and see it full size with its details.

Artworks and images come from the [Art Institute of Chicago API](https://api.artic.edu/docs/) (no key needed). Deployed on Vercel from the `museum` branch.

## Files
- `index.html`, `styles.css`, `museum.js`: the site (no build step). The museum is drawn on a canvas.
- `data/artworks.json`: saved details for each artwork (title, artist, description, image id).
- `scripts/fetch-artworks.mjs`: re-downloads `data/artworks.json`.

## Changing the art
Edit `GALLERIES` in `scripts/fetch-artworks.mjs` (artwork ids are the number in an artic.edu artwork URL), then run:

    node scripts/fetch-artworks.mjs

Room positions, doors and furniture are set at the top of `museum.js`. Each gallery `id` must match a room there.
