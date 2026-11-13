# Mood Food

A recipe website with three ways to find something to cook:

1. **Search:** "I'm in the mood for…" plus filters for cuisine, allergies, diet and budget (cost per serving).
2. **What's in my fridge:** add ingredients and get recipes that use the most of them, with what you're missing.
3. **Spin the wheel:** the wheel picks a cuisine, then a random recipe (optionally using your filters).

Recipes come from the [Spoonacular API](https://spoonacular.com/food-api). Deployed on Vercel from the `recipes` branch.

## Files
- `index.html`, `styles.css`, `app.js`: the website (no build step).
- `api/spoonacular.js`: a Vercel serverless function. It's the only code that talks to Spoonacular, and it adds the API key so the key never appears in the website's code.

## Sample recipes
Until `SPOONACULAR_API_KEY` is set, the site uses about 20 built-in sample recipes from `lib/demo-data.js`, so every page works with no setup. Adding the key switches to real recipes automatically.

## Setup
1. Get a free API key at spoonacular.com/food-api (sign up, then open your Profile / Console).
2. In Vercel: project → Settings → Environment Variables → add `SPOONACULAR_API_KEY` with the key.
3. Redeploy (Deployments → latest → Redeploy).

The free plan allows roughly 50–100 searches a day; after that the site says the daily limit is reached.
