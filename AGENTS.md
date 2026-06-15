# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React SPA (HashRouter for GitHub Pages). `main.jsx` boots `App.jsx`, which defines routes.
- `src/components/` contains shared UI (layout shell, terminal, playground widgets); `src/pages/` are routed screens such as field reports, mind, mud, catgpt, crypto, and verify.
- `src/hooks/` keeps custom hooks prefixed with `use*`; `src/data/` stores navigation, disciples, wallets, and experiment metadata; `src/utils/` houses walkthrough/bridge helpers. Styling lives in `src/index.css` with Tailwind v4 `@theme` tokens.
- `public/` serves static assets and JSON metadata (`reports/`, `mind/`, `playground/`, `reports.json`, `mind.json`, `media`). `dist/` is build output—do not edit by hand.

## Build, Test, and Development Commands
- `npm install` – install dependencies.
- `npm run dev` – start Vite dev server on `http://localhost:5175`.
- `npm run build` – produce the static bundle in `dist/`.
- `npm run preview` – serve the built bundle for smoke testing.
- No default automated tests; validate changes manually in the browser and watch console/network output.

## Coding Style & Naming Conventions
- Use ES modules and functional React components. Prefer PascalCase for components/files and camelCase for helpers; hooks must start with `use`.
- Match existing formatting: single quotes, no semicolons, 2-space indentation.
- Keep new routes declared in `App.jsx` aligned with any added pages.
- Favor Tailwind utility classes with theme tokens from `index.css`; add scoped component classes only when utilities are insufficient.

## Testing Guidelines
- Run `npm run dev` or `npm run preview` and exercise affected routes, terminal commands, and JSON-driven pages. Confirm static assets resolve from `public/`.
- For data additions (field reports, mind captures, playground experiments), ensure IDs/paths match real assets and navigation lists.
- If you add automated tests, follow Vite/Vitest defaults and co-locate specs with source files.

## Commit & Pull Request Guidelines
- Use short, imperative commit messages consistent with history (e.g., "Add field report 2000621711843356992", "Update disciples onboarding").
- Keep commits focused; avoid checking in `dist/`, `logs/`, or `node_modules/`.
- PRs should describe scope, list manual checks, and include screenshots or recordings for UI/UX changes. Link related issues and note any new routes or assets.

## Security & Configuration Tips
- Do not commit secrets or private keys; this site should remain fully static.
- Maintain hash-based routing for GitHub Pages; if deployment targets change, adjust `vite.config.js` `base` and asset paths carefully.
