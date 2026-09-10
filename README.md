# HISTORIA: EUROPE 1936 — FIXED STATIC BUILD

This version deliberately does **not** use the original Open Historia Vite/React/server/content-node architecture.

## Why the previous base could fail on GitHub Pages

The Open Historia files were designed around a larger application:
- `index.html` expected `/src/main.jsx`
- the Vite config expected special build modes
- development expected `/api`
- the web map could depend on content nodes / external map binaries
- its deployment documentation targeted Cloudflare Pages, not a simple repository-root GitHub Pages site

Those assumptions are removed here.

## Deployment — GitHub Pages

1. Create a new GitHub repository.
2. Upload **all files from this ZIP to the repository root**.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**.
6. Save.
7. Open the Pages URL GitHub gives you.

No npm install. No Vite. No build command. No server. No Cloudflare.

## Local test

Double-click `index.html`, or run:

```bash
python -m http.server 8000
```

and open `http://localhost:8000`.

## Controls

- Select simulation mode, difficulty, and country.
- Press **Start Game**.
- Click countries on the map for intelligence.
- Type free-form orders.
- Choose how much time to advance.
- Press **Execute Order & Advance**.
- Save/Load uses browser `localStorage`.

## Current simulation systems

- free-form order parser
- military mobilization and war
- diplomacy and relations
- world tension
- treasury, stability, industry, war support
- AI country activity
- historical-pressure events
- save/load
- responsive mobile UI
- stylized political map

## Important limitation

The map is a deliberately lightweight stylized Europe map so the game can be completely self-contained and reliably deploy on GitHub Pages. It is not a cartographically exact 1936 province dataset yet.

## Reliability design

All paths are relative:
- `./styles.css`
- `./game.js`

There are no repository-name-specific absolute paths, so the site works at:
- `username.github.io/repository-name/`
- a custom domain
- local file/server hosting
