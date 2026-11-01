# BET-Hub: Business English Communication Portal

A free, single-file website (`index.html`). There's no server, no build step and no paid API.

## Modules
1. **Workplace Emails**: 4 scenarios, Formal/Semi-formal register, highlighted collocations and a glossary.
2. **Meetings**: a phrasebook grouped by function, plus a script builder with text-to-speech.
3. **Interviews & Offers**: a STAR answer builder, a 30-second elevator pitch and a 5-step salary negotiation script.
4. **Customer Service**:
   - L.A.S.T framework response builder.
   - **AI Customer Simulator**: 3 customers (Emma: easy, David: normal, Richard: demanding).
     - Left panel: the call. The customer speaks out loud, you reply with the mic (speech-to-text) or by typing, and each reply is recorded so you can play it back.
     - Right panel: a live L.A.S.T script (Greet → Listen → Apologize → Solve → Thank). It highlights the current step, offers lines you can click to use or hear, shows a case file and gives coach tips.
     - A mood meter and a face that reacts live, then a scorecard out of 100 at the end of the call.
     - Settings: edit the customer's issue and opening line, pick the voice, speed and pitch, turn on listening mode (customer text stays hidden) and choose auto-send.
     - Engine: a built-in scenario engine (free, offline) or Google Gemini (optional, free API key from aistudio.google.com).
5. **Thesis Research**: a 5-question knowledge quiz and an 8-item Likert survey (PU / PEOU / confidence). The survey shows mean scores and exports to CSV.

## Browser requirements
- Use **Chrome or Edge** for voice. The mic and speech recognition only work over **https** or on `localhost`, so they won't work if you open the file with a double click (`file://`).
- Firefox and Safari can still play the customer's voice, but you'll have to type your replies.

## Free hosting (pick one)
**Netlify Drop (fastest, no account needed to try):** open https://app.netlify.com/drop and drag the `bet-hub` folder onto the page. You get an https link right away.

**GitHub Pages:**
1. Create a public repo (for example `bet-hub`) and upload `index.html`.
2. Go to Settings → Pages → Source: `Deploy from a branch`, branch `main`, folder `/root`.
3. After 1–2 minutes you'll get a link like `https://<username>.github.io/bet-hub/`.

**Run it locally (for testing):**
```bash
python -m http.server 8080 --directory bet-hub
```
Then open http://localhost:8080.
