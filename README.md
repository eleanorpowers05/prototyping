# ECON 11020 Flashcards

A flashcard and quiz site for ECON 11020 (Intro to Econometrics). It's one self-contained file: `index.html`.

- **Cards:** tap to flip, then mark "Got it" or "Missed it". Missed cards go into the missed pile.
- **Quiz:** select-all-that-apply questions, scored like the exam (n correct answers: +10/n per right pick, −10/n per wrong pick, minimum 0), plus matching questions.
- Filter by lecture and topic. Topics are interleaved by default. Progress is saved in your browser.

## Adding Lectures 11–15
Open `index.html` and add entries to the `CARDS` and `QUIZ` arrays near the top of the `<script>`. Lecture chips turn on by themselves once a lecture has content.

## Hosting on Cloudflare Pages
In Cloudflare, go to Workers & Pages → Create → Pages → Connect to Git, then pick this repo. Leave the build command blank and set the output directory to `/`.
