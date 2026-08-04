# The Resume Desk — Angular + Node

AI resume analyzer: paste or upload a resume (.txt / .pdf), get a score, a rubric
breakdown, strengths/weaknesses, and concrete fixes.

Two parts:
- **frontend/** — Angular 21 app (standalone components, signals, routed pages)
- **backend/** — small Express server that holds the Anthropic API key and proxies
  the analysis request. Never call the Anthropic API directly from the browser —
  that would expose your key to anyone who opens dev tools.

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env and paste your real ANTHROPIC_API_KEY
npm start
```

Server runs on `http://localhost:3000` by default. Health check: `GET /api/health`.

## 2. Frontend setup

```bash
cd frontend
npm install
npm start
```

App runs on `http://localhost:4200` and calls the backend at `http://localhost:3000`
(configured in `src/app/services/resume-analyzer.service.ts` as `API_BASE`).

## Project structure

```
frontend/src/app/
  app.component.ts          shell: masthead + <router-outlet>
  app.routes.ts              '/' -> upload page, '/results' -> results page
  app.config.ts               providers (router, http client)
  services/
    resume-analyzer.service.ts   signals for state, PDF extraction, API call
  pages/
    upload/                  paste / drop file, "Grade my resume"
    results/                 stamp score, rubric, strengths/weaknesses, fixes

backend/
  server.js                  POST /api/analyze -> calls Anthropic, returns JSON
  .env.example                copy to .env with your API key
```

## Notes

- Get an API key from the Anthropic Console (console.anthropic.com).
- `ALLOWED_ORIGIN` in `.env` should match your frontend URL (defaults to
  `http://localhost:4200`) — the backend uses it for CORS.
- For production, deploy the backend somewhere with the env var set, and point
  `API_BASE` in the frontend service at that deployed URL before building.
- Angular 21 is current LTS (supported through May 2027); this project will
  also run fine if you upgrade to Angular 22 later — the patterns used here
  (standalone components, signals, `@if`/`@for` control flow) carry forward.
