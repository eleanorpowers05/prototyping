// Sample recipes used until SPOONACULAR_API_KEY is set in Vercel.
// Each ingredient is [name used for matching, line shown in the recipe].
// `contains` lists the allergy filters a recipe fails; prices are cents per serving.

const R = (id, title, emoji, cuisine, diets, contains, price, minutes, servings, ingredients, steps) =>
  ({ id, title, emoji, cuisines: [cuisine], diets, contains, pricePerServing: price, readyInMinutes: minutes, servings, ingredients, steps });

const VEGAN = ['vegan', 'vegetarian', 'pescetarian'];
const VEG = ['vegetarian', 'pescetarian'];

const RECIPES = [
  R(9001, 'Spaghetti Aglio e Olio', '🍝', 'Italian', VEGAN, ['Gluten', 'Wheat', 'Grain'], 120, 20, 2,
    [['spaghetti', '8 oz spaghetti'], ['garlic', '6 cloves garlic, thinly sliced'], ['olive oil', '1/3 cup olive oil'], ['red pepper flakes', '1/2 tsp red pepper flakes'], ['parsley', '2 tbsp chopped parsley']],
    ['Cook the spaghetti in well-salted water until al dente. Save 1/2 cup of the pasta water.', 'Meanwhile, warm the olive oil and garlic over low heat until the garlic is golden, about 5 minutes. Add the pepper flakes.', 'Toss the drained pasta in the garlic oil with a splash of pasta water until glossy.', 'Finish with parsley and salt to taste.']),
  R(9002, 'Margherita Pizza', '🍕', 'Italian', VEG, ['Dairy', 'Gluten', 'Wheat', 'Grain'], 250, 35, 4,
    [['pizza dough', '1 lb pizza dough'], ['tomatoes', '1 cup crushed tomatoes'], ['mozzarella', '8 oz fresh mozzarella, torn'], ['basil', 'A handful of fresh basil'], ['olive oil', '1 tbsp olive oil']],
    ['Heat the oven as hot as it goes (at least 475°F / 245°C).', 'Stretch the dough onto an oiled tray and spread the tomatoes over it, leaving a border.', 'Scatter the mozzarella and bake 10–14 minutes until bubbling and browned.', 'Top with basil and a drizzle of olive oil.']),
  R(9003, 'Black Bean Tacos', '🌮', 'Mexican', [...VEGAN, 'gluten free'], ['Grain'], 150, 20, 4,
    [['black beans', '2 cans black beans, drained'], ['corn tortillas', '8 corn tortillas'], ['onion', '1 onion, diced'], ['lime', '1 lime'], ['avocado', '1 avocado, sliced'], ['cilantro', 'A handful of cilantro']],
    ['Soften the onion in a little oil, then add the beans with cumin, salt and a splash of water. Mash lightly.', 'Warm the tortillas in a dry pan.', 'Fill with beans, avocado and cilantro, and squeeze lime over the top.']),
  R(9004, 'Chicken Quesadillas', '🧀', 'Mexican', [], ['Dairy', 'Gluten', 'Wheat', 'Grain'], 220, 20, 2,
    [['chicken', '1 cup cooked shredded chicken'], ['flour tortillas', '4 flour tortillas'], ['cheese', '1 1/2 cups shredded cheese'], ['bell pepper', '1 bell pepper, sliced'], ['onion', '1/2 onion, sliced']],
    ['Sauté the pepper and onion until soft.', 'Layer cheese, chicken and vegetables on half of each tortilla and fold.', 'Cook in a dry pan over medium heat, 2–3 minutes per side, until crisp and melted.']),
  R(9005, 'Miso Ramen', '🍜', 'Japanese', [], ['Soy', 'Wheat', 'Gluten', 'Egg', 'Grain'], 350, 30, 2,
    [['ramen noodles', '2 portions ramen noodles'], ['miso paste', '3 tbsp miso paste'], ['eggs', '2 eggs'], ['green onions', '2 green onions, sliced'], ['mushrooms', '1 cup mushrooms, sliced'], ['garlic', '2 cloves garlic, grated']],
    ['Soft-boil the eggs for 6 1/2 minutes, then cool in ice water and peel.', 'Simmer 4 cups of stock with the garlic and mushrooms for 10 minutes. Whisk in the miso off the heat.', 'Cook the noodles, divide into bowls and pour the broth over.', 'Top with halved eggs and green onions.']),
  R(9006, 'Teriyaki Salmon Rice Bowl', '🍣', 'Japanese', ['pescetarian'], ['Seafood', 'Soy', 'Wheat', 'Gluten', 'Grain'], 520, 25, 2,
    [['salmon', '2 salmon fillets'], ['rice', '1 cup rice'], ['soy sauce', '3 tbsp soy sauce'], ['honey', '1 tbsp honey'], ['ginger', '1 tsp grated ginger'], ['cucumber', '1/2 cucumber, sliced']],
    ['Cook the rice.', 'Stir together the soy sauce, honey and ginger.', 'Sear the salmon skin-side down for 4 minutes, flip, add the sauce and cook 2–3 minutes until glazed.', 'Serve over rice with cucumber.']),
  R(9007, 'Chickpea Curry (Chana Masala)', '🍛', 'Indian', [...VEGAN, 'gluten free'], ['Grain'], 130, 35, 4,
    [['chickpeas', '2 cans chickpeas, drained'], ['tomatoes', '1 can diced tomatoes'], ['onion', '1 onion, diced'], ['garlic', '3 cloves garlic, minced'], ['ginger', '1 tbsp grated ginger'], ['garam masala', '2 tsp garam masala'], ['rice', 'Rice, to serve']],
    ['Cook the onion in oil until golden, then add the garlic, ginger and garam masala for 1 minute.', 'Add the tomatoes and chickpeas and simmer 20 minutes, mashing a few chickpeas to thicken.', 'Season with salt and serve with rice.']),
  R(9008, 'Butter Chicken', '🍗', 'Indian', ['gluten free'], ['Dairy'], 390, 45, 4,
    [['chicken', '1 1/2 lb chicken thighs, cubed'], ['butter', '3 tbsp butter'], ['cream', '1/2 cup heavy cream'], ['tomatoes', '1 can crushed tomatoes'], ['garlic', '3 cloves garlic'], ['ginger', '1 tbsp grated ginger'], ['garam masala', '2 tsp garam masala']],
    ['Brown the chicken in half the butter and set aside.', 'Melt the rest of the butter, cook the garlic, ginger and garam masala, then add the tomatoes and simmer 10 minutes.', 'Stir in the cream and chicken and simmer until cooked through.']),
  R(9009, 'Pad Thai', '🥜', 'Thai', [], ['Peanut', 'Egg', 'Seafood', 'Soy', 'Grain'], 330, 30, 2,
    [['rice noodles', '6 oz flat rice noodles'], ['eggs', '2 eggs'], ['tofu', '7 oz firm tofu, cubed'], ['peanuts', '1/4 cup roasted peanuts, chopped'], ['bean sprouts', '1 cup bean sprouts'], ['lime', '1 lime'], ['fish sauce', '2 tbsp fish sauce']],
    ['Soak the noodles in hot water until pliable, then drain.', 'Fry the tofu until golden, push aside and scramble the eggs.', 'Add the noodles with fish sauce, a little sugar and lime juice; toss until coated.', 'Top with bean sprouts and peanuts.']),
  R(9010, 'Thai Green Curry with Vegetables', '🥥', 'Thai', [...VEGAN, 'gluten free'], ['Grain'], 280, 30, 4,
    [['coconut milk', '1 can coconut milk'], ['green curry paste', '3 tbsp green curry paste'], ['tofu', '14 oz firm tofu, cubed'], ['bell pepper', '1 bell pepper, sliced'], ['zucchini', '1 zucchini, sliced'], ['basil', 'A handful of basil'], ['rice', 'Rice, to serve']],
    ['Fry the curry paste in a splash of coconut milk for 1 minute.', 'Add the rest of the coconut milk, tofu and vegetables and simmer 10 minutes.', 'Stir in basil and serve with rice.']),
  R(9011, 'Egg Fried Rice', '🍚', 'Chinese', VEG, ['Egg', 'Soy', 'Wheat', 'Gluten', 'Grain'], 90, 15, 2,
    [['rice', '3 cups cooked rice (day-old is best)'], ['eggs', '2 eggs, beaten'], ['peas', '1/2 cup peas'], ['carrots', '1 carrot, diced'], ['green onions', '2 green onions, sliced'], ['soy sauce', '2 tbsp soy sauce']],
    ['Stir-fry the carrots and peas in a hot pan for 2 minutes.', 'Push them aside, scramble the eggs, then add the rice.', 'Toss with soy sauce until hot and slightly crisp, then add the green onions.']),
  R(9012, 'Kung Pao Chicken', '🌶️', 'Chinese', [], ['Peanut', 'Soy', 'Wheat', 'Gluten'], 340, 30, 3,
    [['chicken', '1 lb chicken breast, cubed'], ['peanuts', '1/3 cup peanuts'], ['bell pepper', '1 bell pepper, diced'], ['soy sauce', '3 tbsp soy sauce'], ['garlic', '3 cloves garlic, sliced'], ['dried chilies', '6 dried chilies']],
    ['Toss the chicken in 1 tbsp soy sauce and a little cornstarch.', 'Stir-fry the chilies and garlic for 30 seconds, then the chicken until browned.', 'Add the pepper, the rest of the soy sauce and a pinch of sugar; cook 2 minutes.', 'Toss in the peanuts.']),
  R(9013, 'Mushroom Omelette', '🍳', 'French', [...VEG, 'gluten free', 'ketogenic'], ['Egg', 'Dairy'], 160, 10, 1,
    [['eggs', '3 eggs'], ['mushrooms', '1/2 cup mushrooms, sliced'], ['butter', '1 tbsp butter'], ['cheese', '2 tbsp grated cheese'], ['chives', '1 tbsp chives']],
    ['Cook the mushrooms in half the butter until golden; set aside.', 'Beat the eggs with salt. Melt the remaining butter and pour in the eggs, stirring gently until just set.', 'Add the mushrooms and cheese, fold and slide onto a plate. Top with chives.']),
  R(9014, 'Greek Salad', '🥗', 'Greek', [...VEG, 'gluten free', 'ketogenic'], ['Dairy'], 270, 10, 2,
    [['tomatoes', '3 tomatoes, cut into wedges'], ['cucumber', '1 cucumber, chopped'], ['red onion', '1/2 red onion, sliced'], ['feta', '4 oz feta'], ['olives', '1/3 cup kalamata olives'], ['olive oil', '3 tbsp olive oil']],
    ['Combine the tomatoes, cucumber, onion and olives.', 'Top with the feta, drizzle with olive oil, and sprinkle with oregano and salt.']),
  R(9015, 'Bibimbap', '🥢', 'Korean', [], ['Egg', 'Soy', 'Sesame', 'Wheat', 'Gluten', 'Grain'], 310, 40, 2,
    [['rice', '1 cup rice'], ['ground beef', '8 oz ground beef'], ['spinach', '2 cups spinach'], ['carrots', '1 carrot, julienned'], ['eggs', '2 eggs'], ['gochujang', '2 tbsp gochujang'], ['sesame oil', '1 tbsp sesame oil']],
    ['Cook the rice.', 'Brown the beef with a splash of soy sauce. Separately, quickly sauté the spinach and carrots.', 'Fry the eggs sunny-side up.', 'Arrange everything over rice, add gochujang and sesame oil, and mix at the table.']),
  R(9016, 'Shakshuka', '🍅', 'Mediterranean', [...VEG, 'gluten free'], ['Egg'], 140, 25, 2,
    [['eggs', '4 eggs'], ['tomatoes', '1 can crushed tomatoes'], ['onion', '1 onion, diced'], ['bell pepper', '1 bell pepper, diced'], ['garlic', '2 cloves garlic'], ['cumin', '1 tsp cumin']],
    ['Soften the onion and pepper, then add the garlic and cumin.', 'Add the tomatoes and simmer 10 minutes until thick.', 'Make 4 wells, crack in the eggs, cover and cook until the whites are set.']),
  R(9017, 'Classic Cheeseburger', '🍔', 'American', [], ['Dairy', 'Gluten', 'Wheat', 'Grain', 'Sesame'], 420, 25, 4,
    [['ground beef', '1 lb ground beef'], ['burger buns', '4 sesame burger buns'], ['cheese', '4 slices cheddar'], ['lettuce', 'Lettuce leaves'], ['tomatoes', '1 tomato, sliced'], ['onion', '1/2 onion, sliced']],
    ['Shape the beef into 4 patties and season well.', 'Cook in a hot pan 3–4 minutes per side, adding cheese in the last minute.', 'Toast the buns and build with lettuce, tomato and onion.']),
  R(9018, 'Fluffy Pancakes', '🥞', 'American', VEG, ['Dairy', 'Egg', 'Gluten', 'Wheat', 'Grain'], 70, 20, 4,
    [['flour', '1 1/2 cups flour'], ['milk', '1 1/4 cups milk'], ['eggs', '1 egg'], ['butter', '3 tbsp melted butter'], ['sugar', '1 tbsp sugar'], ['baking powder', '3 1/2 tsp baking powder']],
    ['Whisk the flour, sugar, baking powder and a pinch of salt.', 'Add the milk, egg and butter and stir until just combined (lumps are fine).', 'Cook 1/4 cup portions on a buttered pan until bubbles form, then flip.']),
  R(9019, 'Falafel Wraps', '🧆', 'Middle Eastern', VEGAN, ['Gluten', 'Wheat', 'Sesame', 'Grain'], 180, 40, 4,
    [['chickpeas', '2 cans chickpeas, drained and dried'], ['pita bread', '4 pita breads'], ['tahini', '1/4 cup tahini'], ['parsley', '1 cup parsley'], ['garlic', '2 cloves garlic'], ['cucumber', '1 cucumber, chopped']],
    ['Pulse the chickpeas, parsley, garlic, cumin and salt into a coarse paste.', 'Shape into small patties and pan-fry until crisp on both sides.', 'Thin the tahini with lemon and water.', 'Wrap the falafel in pita with cucumber and tahini sauce.']),
  R(9020, 'Red Lentil Soup', '🥣', 'Middle Eastern', [...VEGAN, 'gluten free'], [], 80, 35, 4,
    [['red lentils', '1 cup red lentils'], ['onion', '1 onion, diced'], ['carrots', '2 carrots, diced'], ['cumin', '2 tsp cumin'], ['lemon', '1 lemon'], ['garlic', '2 cloves garlic']],
    ['Soften the onion, carrots and garlic in oil, then add the cumin.', 'Add the lentils and 5 cups of water or stock and simmer 20 minutes.', 'Blend until smooth and finish with lemon juice and salt.']),
];

const PANTRY = new Set(['olive oil', 'oil', 'salt', 'pepper', 'water', 'sugar', 'flour', 'butter']);
const norm = (s) => String(s).toLowerCase().trim().replace(/(es|s)$/, '');
const matches = (a, b) => { const x = norm(a), y = norm(b); return x === y || x.includes(y) || y.includes(x); };
const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

const card = (r) => ({
  id: r.id, title: r.title, emoji: r.emoji, image: null, readyInMinutes: r.readyInMinutes, servings: r.servings,
  pricePerServing: r.pricePerServing, cuisines: r.cuisines, diets: r.diets,
});

function search(q) {
  const cuisines = list(q.get('cuisine')).map((c) => c.toLowerCase());
  const avoid = list(q.get('intolerances')).map((c) => c.toLowerCase());
  const diets = list(q.get('diet')).map((d) => d.toLowerCase());
  const max = Number(q.get('maxPrice')) || Infinity;
  const words = String(q.get('query') || '').toLowerCase().split(/\W+/).filter((w) => w.length > 2);

  let results = RECIPES.filter((r) =>
    (!cuisines.length || r.cuisines.some((c) => cuisines.includes(c.toLowerCase()))) &&
    !r.contains.some((c) => avoid.includes(c.toLowerCase())) &&
    diets.every((d) => r.diets.includes(d)) &&
    r.pricePerServing <= max);

  if (words.length) {
    const score = (r) => {
      const hay = [r.title, ...r.cuisines, ...r.ingredients.map((i) => i[0])];
      return words.filter((w) => hay.some((h) => matches(h, w) || h.toLowerCase().includes(w))).length;
    };
    results = results.map((r) => [score(r), r]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).map(([, r]) => r);
  }
  if (q.get('sort') === 'random') results = results.map((r) => [Math.random(), r]).sort((a, b) => a[0] - b[0]).map(([, r]) => r);
  else if (Number.isFinite(max)) results = [...results].sort((a, b) => a.pricePerServing - b.pricePerServing);

  results = results.slice(0, Number(q.get('number')) || 24).map(card);
  return { results, totalResults: results.length, demo: true };
}

function fridge(q) {
  const have = list(q.get('ingredients'));
  const results = RECIPES.map((r) => {
    const names = r.ingredients.map((i) => i[0]).filter((n) => !PANTRY.has(n));
    const used = names.filter((n) => have.some((h) => matches(n, h)));
    const missed = names.filter((n) => !used.includes(n));
    return { ...card(r), usedCount: used.length, missedCount: missed.length, used, missed };
  }).filter((r) => r.usedCount > 0)
    .sort((a, b) => b.usedCount - a.usedCount || a.missedCount - b.missedCount)
    .slice(0, Number(q.get('number')) || 24);
  return { results, demo: true };
}

function recipe(q) {
  const r = RECIPES.find((x) => String(x.id) === q.get('id'));
  if (!r) return null;
  return { ...card(r), summary: '', sourceUrl: null, sourceName: null, dishTypes: [], ingredients: r.ingredients.map((i) => i[1]), steps: r.steps, demo: true };
}

module.exports = { search, fridge, recipe };
