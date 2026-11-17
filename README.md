# The Miniature Museum

A bird's-eye, dollhouse-style museum. Little visitors wander between the galleries and scatter away from your cursor. Click a painting (or use the Guide) to zoom in and see it full size with its details. Click the statue in the lobby and it runs away, then sneaks back to its pedestal.

Artworks and images come from the [Art Institute of Chicago API](https://api.artic.edu/docs/) (no key needed). Deployed on Vercel from the `museum` branch.

## Files
- `index.html`, `styles.css`, `museum.js`: the site (no build step). The museum is drawn on a canvas.
- `data/artworks.json`: saved details for each artwork (title, artist, description, image id).
- `images/`: each artwork's image (843px wide), saved here because the museum's image server doesn't let other websites embed its images. The map shows them as pixel art; the viewer shows the full image.
- `scripts/fetch-artworks.mjs`: re-downloads `data/artworks.json`.

## Changing the art
Edit `GALLERIES` in `scripts/fetch-artworks.mjs` (artwork ids are the number in an artic.edu artwork URL), then run:

    node scripts/fetch-artworks.mjs

Pieces from other museums go in `CUSTOM` in the same script, with their image saved as `images/<id>.jpg` (like Soir Bleu, on loan from the Whitney).

Room positions, doors and furniture are set at the top of `museum.js`. Each gallery `id` must match a room there.
