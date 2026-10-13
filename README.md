# ChatIST

A bare-bones chatbot for showing how LLMs work: no system prompt, no web search, no hidden reasoning. Answers are colored by how confident the model was in each token, and clicking any token shows the alternatives it considered.

## Run it

Put your OpenRouter key in `.env`:

```text
OPENROUTER_API_KEY=sk-or-v1-...
```

Then either:

- **Devcontainer:** open the folder in VS Code and choose "Reopen in Container". The server starts and opens in your browser.
- **Locally (Node 22+):** run `npm start` and open <http://localhost:3000>.

There are no npm dependencies.

## Using it in the talk

- **Demos** on the left come from `script.txt`. Clicking one fills the message box; press Enter to send. Demos that need a clean slate start a new conversation first. Each demo also switches to the model and creativity setting that shows its point best; they're listed under each button.
- **Next word** mode sends raw text and shows the top 5 guesses for the next token. Click a guess to add it, or press "Keep writing". The "Green eggs and ham" demo switches to GPT-3.5 Turbo, which spreads its guesses the most.
- **Remember conversation** off sends only your latest message, so "What should you call me?" fails. Turn it back on and the model sees the whole history again. "What the model received" shows exactly what was sent.
- **New conversation** (or Ctrl+L) clears the history.
- **Creativity** is temperature. Use 0 for repeatable answers.

## No internet at the venue?

Every live answer is saved in `recordings/`. Turn on **Offline** to replay them. Replay needs the exact same prompt, model and creativity setting, so do a full run-through at your talk settings beforehand. If the connection drops mid-talk, ChatIST falls back to a recording automatically when one exists.

Fonts load from Google Fonts. Offline, the page falls back to system fonts.

## Changing models

Edit `public/models.js`. Whether a model returns probabilities is detected from OpenRouter automatically. `npm run probe -- <model-id>` tests a model directly.
