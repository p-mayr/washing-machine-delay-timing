# Development Plan

### Tech stack
- Static site: plain HTML + CSS + vanilla JavaScript (no build step)
- Hosting: GitHub Pages (from `main` branch, root or `/docs`)
- No backend; all calculation client-side

> ⚠️ GitHub Pages from a **private** repo requires a paid plan (GitHub Pro/Team).
> Plan: keep repo private during development, test locally, make public + enable Pages when finished.

### Calculation logic
1. `finish_target` – if earlier than or equal to `now`, roll over to the next day
2. `delay_exact = finish_target - now - program_time`
3. Machine uses **start delay** (machine starts after X h) → `delay = delay_exact`
4. Delay is set in **full hours only** – show both options with resulting finish times:
   - rounded down → finishes up to 59 min **before** target
   - rounded up → finishes up to 59 min **after** target
5. Clamp to 0–24 h; show a warning if outside range (too late / too early)

### Phases
**Phase 1 – MVP**
- [ ] `index.html` with form: current time (default now, editable), program time (preset dropdown + custom input), target finish time
- [ ] `app.js` with calculation function + live update on input
- [ ] Output: recommended delay setting and resulting actual finish time
- [ ] Basic responsive `style.css` (mobile first – used next to the machine)

**Phase 2 – Usability**
- [ ] Save last used settings in `localStorage`
- [ ] Shareable link with parameters in URL (`?program=2:30&finish=07:00`)

**Phase 3 – Polish**
- [ ] Editable program presets list
- [ ] Unit tests for calculation logic (e.g. Node test runner or Vitest)
- [ ] PWA (offline, add to home screen)
- [ ] Optional: German/English language toggle

### Planned structure
```
index.html
style.css
app.js        # UI wiring
calc.js       # pure calculation functions (testable)
tests/
```

### Decisions
- Delay type: start delay ("start in X h")
- Delay step: full hours only (0–24 h)
- Tech stack: plain HTML + CSS + vanilla JS, no build step; tests with `node --test`
- Visibility: repo stays private until finished
  - Development: test locally (open `index.html` or `python3 -m http.server`)
  - Release: make repo public → enable GitHub Pages (Settings → Pages → `main` / root)

### Open questions
- Which program presets/durations should be defaults? (to be defined later)
