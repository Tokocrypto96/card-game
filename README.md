# Ember Sigils

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Tokocrypto96/card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Tokocrypto96/card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An original offline card duel against Rook, the Ember Warden. Built for the
[make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826).

## How to play

- Each round, play one sigil card from your hand. Higher power wins the round;
  the loser takes the difference as damage. First to bring the other to 0 life wins.
- **Resonance:** playing a card whose element matches your own previous card adds
  +2 power.
- **Wardstone** (Stone) blocks all damage that round. **Tidecaller** (Tide) heals
  2 life. **Thornbloom** (Leaf) grants +1 energy next round.
- You start with 20 life and 3 energy, gain 1 energy a round (max 6), and draw a
  card each round. Cards cost 1–3 energy.
- Click a card to select it, click it again (or press Enter) to play it. Keys 1–5
  select a card, pressing the same key again plays it. P pauses, M toggles sound,
  R restarts, Q returns to the title screen.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

The game is plain static files under `game/` — no build step, no network
request, no external assets. Sounds are synthesised with the Web Audio API.
`?shot=title|play|win|loss&seed=N` renders a fixed scene for screenshots.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/deck.js` — the twelve original cards and the deck
- `game/src/state.js` — duel state, round resolution, Resonance
- `game/src/ai.js` — Rook's strategy
- `game/src/render.js` — all drawing: table, cards, sigil glyphs, screens
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/input.js` — mouse and keyboard
- `game/src/shots.js` — the `?shot=` scenes
- `game/src/main.js` — boot and the game loop
- `main.ts` — hands `game/` and `screenshots/` in and writes `dossier.json`
- `serve.ts` — a tiny static server for local play

## License

MIT — see [LICENSE](LICENSE).
