# HISTORIA: 1936 — PC MAX

A self-contained browser grand-strategy / alternate-history sandbox.

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload **all files from this folder** to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/(root)`.
6. Save and open the GitHub Pages URL.

There is **no npm install, Vite build, backend, database, API server, Cloudflare worker, or content-node service**.

## Files

- `index.html` — application shell
- `styles.css` — desktop-first three-column strategy UI
- `data.js` — countries, strategic regions, borders, historical pressures, command vocabulary
- `engine.js` — state, parser, policies, consequences, diplomacy, warfare, economy, saves
- `ai.js` — autonomous AI planning and threat/opportunity evaluation
- `ui.js` — panels, map, timeline, intelligence and diplomatic UI
- `main.js` — startup, controls, keyboard shortcuts and map gestures
- `.nojekyll` — GitHub Pages compatibility

## Core simulation philosophy

Historia does not treat a command as a text prompt that produces a flavour response. Orders are parsed into intent, target, region, scale, duration, secrecy, conditions and safeguards, then mapped into persistent simulation systems.

Examples:
- Mobilisation transfers manpower into the army over time and pressures industry, GDP, treasury, equipment and stability.
- Rearmament competes with civilian industry and creates foreign threat perception.
- Trade improves output and relationships but creates dependencies.
- Guarantees and alliances create future credibility tests.
- Covert operations can fail or become exposed.
- Wars progress through strategic regions and depend on quality, readiness, logistics, fuel, terrain, fortification and air power.
- Long time jumps interrupt when major events directly affect the player.

AI governments use the **same order resolver** as the player. Difficulty primarily changes planning competence/noise, not arbitrary stat cheats.

## Useful controls

- Click a country: select / inspect it.
- Mouse wheel: zoom the map.
- Drag map: pan.
- `Ctrl/Cmd + Enter` in the order box: queue order.
- `Ctrl/Cmd + S`: save.
- Rewind restores previous time-advance checkpoints.

## Suggested test campaign

Start Germany, then try:

1. `Move troops into the Rhineland but retreat if France responds militarily.`
2. Advance one month.
3. `Mobilise 500,000 reservists over 12 months, exempt skilled factory workers, and avoid major public unrest.`
4. `Offer the Soviet Union a non-aggression pact.`
5. `Fund political influence in Austria secretly.`
6. Advance several months and watch AI countries pursue independent policies.
7. `Invade Poland.`

This build is intentionally static-host friendly. The political map is an original stylized strategic map rather than a heavyweight external map-data service.
