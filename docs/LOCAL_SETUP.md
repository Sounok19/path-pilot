# Path Pilot — Student Career Guidance System

A complete MEAN-stack laboratory project based on the supplied Student Career Guidance System SRS. Built for the **Software Engineering and Project Management lab, PCCCS504**. Project/team name: **Path Pilot**.

Students manage their academic profile, skills, topics and career goals; take practice tests; review performance; and receive explainable skill-gap guidance. Administrators manage the local question bank and view basic system activity.

## Start here

1. Extract the ZIP to a normal local folder, such as `C:\Projects\path-pilot`. Do not run it inside the ZIP viewer.
2. Choose **Option A: Docker** for the bundled application/database, or **Option B: local development** to edit the project.
3. Run the sample-data command once if you want the demonstration accounts. Registration also supports creating your own student account.

The ZIP contains the source, a locked dependency file, tests, documentation, and a prebuilt Angular interface. It intentionally excludes `node_modules`, real passwords, `.env`, database files, and temporary test data. Initial dependency installation needs internet access.

## Prerequisites

- **Node.js 24 LTS** and its bundled npm. Node 22.12+ is also supported; use Node 24 for the documented setup. Do not use Node 26 with this Angular 20 project.
- For Docker: Docker Desktop with Compose enabled, running **Linux containers**. Node is used for the one-time configuration command.
- For local development: **MongoDB Community Server 8.0**, running as a local service, or a MongoDB Atlas connection string. The automated tests use a separate temporary MongoDB 7 process.
- A recent Chrome, Edge, or Firefox browser; a code editor such as VS Code for development.

Check your tools in a terminal:

```text
node --version
npm --version
docker --version
```

The Docker command is only required for Option A. On Windows, if PowerShell blocks `npm.ps1`, use **Command Prompt** or substitute `npm.cmd` for `npm`; no execution-policy change is needed.

## Option A — Docker application and MongoDB

Open a terminal **inside the extracted `path-pilot` folder**:

```text
node scripts/setup.mjs
docker compose up --build -d
docker compose exec app npm run seed
```

The first command creates `.env` with a unique session secret. The first Docker build downloads dependencies and builds Angular; allow time for it to finish.

Open **http://127.0.0.1:3000**. Use the accounts below or register a student. The app and database ports are bound to your own computer for this lab setup.

Useful commands:

```text
docker compose logs -f app
docker compose stop
docker compose start
docker compose down
```

`stop`, `start`, and `down` preserve the named MongoDB volume. **Do not add `-v` to `docker compose down` unless you intend to delete all database data.** Code changes require `docker compose up --build -d` again. This Docker configuration is for a local HTTP lab; deployment requires additional HTTPS and database security configuration.

## Option B — Local development

Start MongoDB Community Server first, or set up an Atlas database. Then run from the extracted project root:

```text
npm ci
npm run setup
```

Open `.env` in your editor. The default is:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/path_pilot
```

For Atlas, replace that URI with your own database connection string, including a database name. Configure the Atlas database user and allowed network address. URL-encode special characters in connection-string passwords. Keep `.env` private.

Now run:

```text
npm run seed
npm run dev
```

Open **http://127.0.0.1:4200**. The Angular development server proxies `/api` requests to Express on port 3000. Keep the terminal open; press **Ctrl+C** to stop the development servers.

For a single-server demonstration:

```text
npm run build
npm start
```

Open **http://127.0.0.1:3000**. Stop `npm run dev` first to release port 3000. The bundled prebuilt interface can also be served with `npm start` after installing dependencies and configuring MongoDB; rebuild whenever you modify the frontend.

### Demo accounts

Available **only after explicitly running `npm run seed`**:

| Role | Email | Default demo password |
| --- | --- | --- |
| Student | `student@pathpilot.local` | `PilotLab2026!` |
| Administrator | `admin@pathpilot.local` | `PilotLab2026!` |

The student has an illustrative academic profile, five skills, three learning topics, a career goal, and three **sample** test results. These are demonstration records, not real student performance.

Set `DEMO_PASSWORD` in `.env` **before the first seed** to choose a different password. Seeding adds missing sample accounts and questions; it does not reset existing passwords, profiles, attempts, or edited questions. Demo seeding is disabled when `NODE_ENV=production`.

### Create your own administrator

Public registration always creates a student. Add these values to `.env` with your own credentials:

```dotenv
ADMIN_EMAIL=your-admin@example.com
ADMIN_NAME=Lab Administrator
ADMIN_PASSWORD=choose-a-unique-long-password
```

Run `npm run create-admin`, or `docker compose exec app npm run create-admin` for Docker. If you just changed Docker's `.env`, run `docker compose up -d --force-recreate app` first so the container receives the new values. This command creates a new administrator; it refuses to overwrite or promote an existing email. Remove `ADMIN_PASSWORD` from `.env` after provisioning and recreate the Docker app again if applicable. Passwords require at least 10 characters and at most 72 UTF-8 bytes.

## How to use the system

### Student workflow

1. **Create an account / sign in.** Registration needs a name, valid email format, and password. Email delivery or email ownership verification is not included.
2. **My profile:** enter college, degree, year, CGPA out of 10, a short introduction, and career interests. Use CGPA 0 if unavailable. Click **Save profile**.
3. **Learning tracker:** add skills from the supported list, rate confidence from 0–100, and write areas to develop. Add learning topics with the associated skill, progress percentage, and hours spent. Click **Save learning progress** after additions, edits, or removals.
4. **Career goals:** add a career path, target date, success notes, and active/completed status. Click **Save goals**. Dates are planning targets, not reminders.
5. **Mock tests:** choose Mixed or a specific skill. Local tests contain up to five available questions. External practice requests five computer-fundamentals questions from Open Trivia DB, with a local fallback on timeout or invalid/unavailable responses.
6. Answer every question and click **Submit test**. Scoring is performed by the server, and submitted answers cannot be changed. Review the correct answers and explanations. Tests are untimed practice, not supervised examinations.
7. **Performance:** review average/best scores, recent results, skill-level accuracy, completed topics, and logged hours.
8. **Career guidance:** view ranked career paths, skill gaps, the evidence behind each estimate, and external learning links. Add/update skills and goals to change your roadmap.

Unsubmitted attempts can be resumed from Mock tests. Answer selections are preserved in browser session storage for that tab; the server stores the attempt immediately, but stores answers only on submission. A new browser may require re-entering unsubmitted answers. Profile, learning, and goal edits must be saved before navigating away. Simultaneous profile edits in separate tabs are rejected with a reload message to prevent silently overwriting newer data.

### Administrator workflow

1. Sign in using a provisioned administrator account.
2. Review student count, completed tests, average scores, and active questions.
3. Add a question with a supported skill, four distinct options, a correct option, and an explanation.
4. Use **Edit** to change a question or mark it **Inactive**. Existing attempts retain their original question snapshots; inactive questions are excluded from new tests.
5. View the basic student directory. Detailed student profiles and individual answers are not exposed by the administrator endpoints.

## How recommendations work

This is a transparent, **rule-based** learning guidance system. It does not call an AI model, predict employment, or perform a validated psychometric assessment.

- Each skill estimate combines self-reported confidence (weight 0.5), average topic progress for that skill (0.2), and accuracy across all answered local test questions for that skill (0.3).
- Missing topic/test evidence is omitted and the remaining weights are normalized. A missing self-reported skill contributes 0 at its retained 0.5 weight. Hours are tracked in analytics but do not inflate skill scores.
- Each career has illustrative skill targets. A gap is `max(target − estimate, 0)`. Readiness is the mean of the per-skill target attainment, with each skill capped at 100%.
- Career ordering uses readiness plus 25 points for an active goal and 10 for a matching stated interest. These bonuses affect order, not the displayed readiness percentage.
- Next-step messages also use year of study, CGPA when available, and whether the student has assessment evidence or active goals.
- External computer trivia appears in performance analytics, but is excluded from career-specific skill estimates.

Career targets and resource links are maintained in `server/src/catalog.js`. They are curriculum examples for this lab. Curated learning links work without an API key; provider availability and any fees are outside this application.

## Project structure

```text
path-pilot/
  client/                 Angular standalone components, forms, routing, styling
    src/app/              Student pages, admin page, API/session service
    dist/path-pilot/     Prebuilt Angular application (included)
  server/src/
    app.js                Express routes, authorization, validation, errors
    models.js             MongoDB/Mongoose models and indexes
    validation.js         Request schemas
    guidance.js           Analytics and recommendation calculations
    quiz-provider.js      Open Trivia DB adapter and local fallback
    catalog.js            Careers, learning resources, original questions
    seed*.js              Non-destructive demonstration data setup
  server/test/            API integration tests against isolated MongoDB
  tests/                  Browser workflow tests
  scripts/                Setup, browser test server, performance check
  docs/                   Architecture, API, SRS traceability, test report
  compose.yaml            Local app + persistent MongoDB
  package-lock.json       Reproducible dependency versions
  .env.example            Configuration reference; no real credentials
```

## Tests and lab evaluation

```text
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:perf
```

- `npm test` starts a temporary **real MongoDB** using `mongodb-memory-server`; no local MongoDB service is needed for these tests. The first run downloads a MongoDB binary and can be slow (about 600 MB on Windows in the validation environment).
- Browser tests require a built Angular app and Playwright Chromium. They start their own API on port **3100** with a temporary database; keep that port free. The external provider is intentionally simulated as unavailable for deterministic fallback testing.
- If a Chromium-family browser is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable before the browser tests instead of downloading Chromium.
- `npm run test:perf` checks 200 authenticated local read operations, concurrency 10, against the small sample dataset. This is evidence for the chosen lab workload, not proof of production capacity.
- Automated tests never use the configured `MONGODB_URI` and do not change the normal lab database.

Read `docs/TEST_REPORT.md` for observed results and the manual demo checklist. `docs/REQUIREMENTS.md` maps every SRS requirement to implementation and verification. `docs/ARCHITECTURE.md` includes component, data model, and sequence diagrams. `docs/API.md` documents the REST endpoints.

## Configuration reference

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Persistent database connection; Docker overrides it to its Mongo service |
| `JWT_SECRET` | Unique 32+ character secret; generated by setup; changing it signs out existing sessions |
| `PORT` / `HOST` | Express listener; defaults `3000` / `127.0.0.1`; Docker uses `0.0.0.0` inside the container |
| `COOKIE_SECURE` | `false` for local HTTP; `true` for HTTPS deployment |
| `NODE_ENV` | `development` for the supplied local lab setup; production requires secure cookies |
| `ENABLE_EXTERNAL_QUIZZES` | `true` to use Open Trivia DB; `false` always uses local fallback |
| `DEMO_PASSWORD` | Password used only when creating missing demo accounts |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Used only by the explicit administrator-creation command |

If you change the local API port, update `client/proxy.conf.json` too. If you change the Docker application port, update its port mapping. Use the same hostname throughout a browser session; `localhost` and `127.0.0.1` have different cookie stores.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| `npm` is not recognized | Install Node.js 24 LTS and reopen your terminal |
| PowerShell blocks `npm.ps1` | Use `npm.cmd` or Command Prompt |
| MongoDB connection refused | Start MongoDB, check `MONGODB_URI`, or use Docker; the project does not silently substitute a fake database |
| Port 3000 / 4200 / 27017 is occupied | Stop the other server, or configure a different port and update its proxy/mapping |
| Demo login fails | Run the seed command against the same database; check whether `DEMO_PASSWORD` differed on the first seed |
| Login succeeds but session disappears | Use one hostname; for local HTTP ensure `COOKIE_SECURE=false` |
| API works but page is missing | Run `npm run build`, then restart `npm start`; in development use port 4200 |
| External quiz fails or is rate-limited | The local fallback is expected; it requires active local questions (run seed or add questions) |
| No local questions available | Run `npm run seed` or add/activate questions as administrator |
| Profile reports a conflict | Reload to fetch the latest saved version, then reapply your changes |
| Test binary download is blocked | Allow MongoDB's official download host or configure `MONGOMS_SYSTEM_BINARY` to a compatible installed `mongod` executable |
| Build reports access denied in parent folders | Extract to a writable normal folder such as `C:\Projects\path-pilot`; avoid restricted or cloud-only folders |

The runtime uses HTTP-only, SameSite cookies, bcrypt password hashes, per-request authorization, request validation, request-rate limits, and a required custom header for state-changing requests. Production use additionally requires HTTPS, secure authenticated MongoDB, backups, operational monitoring, and a deployment review. Password reset, email verification, appointment booking, job scraping, and notifications are outside this SRS implementation.

## Sources and attribution

- Supplied six-page Student Career Guidance System SRS, dated 19 August 2026, used as the requirements baseline.
- [Angular compatibility reference](https://angular.dev/reference/versions) for Angular 20 / Node 24 / TypeScript compatibility.
- [Open Trivia DB API documentation](https://opentdb.com/api_config.php). External question content is **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**; the application attributes it in each external attempt. External questions are fetched at runtime and are not bundled into the original local question bank.
- The local sample questions, application code, and sample student records were created for this project. Review and adapt them with your team before the lab submission.
