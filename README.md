# Path Pilot

Path Pilot is a student career guidance app built for a Software Engineering Lab. It uses Angular, Express, Node.js and MongoDB.

Students can keep a learning log, choose a career direction, take practice tests and get a four-week roadmap. Administrators can view enrollments and payment records, review proposed skills and publish practice questions. An active subscription unlocks the student tools. The lab uses a simulated checkout with success, failure and cancellation outcomes.

## Run locally

Install Node.js 24.x and start a MongoDB instance you control. The example configuration uses `mongodb://127.0.0.1:27017/path_pilot`.

From the folder containing `package.json`, install dependencies and generate your local configuration.

```powershell
npm.cmd ci
npm.cmd run setup
```

In `.env`, set `MONGODB_URI` if your database uses a different address. Keep `PAYMENT_MODE=simulation` for the lab and `PORT=3001` for the Angular proxy. Setup creates a unique `JWT_SECRET`. Keep the generated secret and the rest of `.env` on your machine.

For a **new demo database**, set your own distinct `DEMO_PASSWORD` and `ADMIN_PASSWORD` in `.env`. Each must be at least 10 characters and at most 72 UTF-8 bytes. Provision the demo accounts and questions with:

```powershell
node deploy/provision.mjs
```

Use `student@pathpilot.local` or `admin@pathpilot.local` with the matching password you chose. Provisioning sets both demo passwords. To keep existing database records and passwords, use your existing accounts. If an older database only needs enrollment records added, run `node deploy/migrate-enrollments.mjs`.

On Windows, start the Angular development server and the Express API together:

```powershell
npm.cmd run dev
```

Open `http://127.0.0.1:4300`. Express listens on port 3001. To run the bundled app on Windows, macOS or Linux, build and serve it instead:

```sh
npm run build
npm start
```

With the example configuration, open `http://127.0.0.1:3001`. On Windows use `npm.cmd` if PowerShell blocks the `npm.ps1` shim.

## Demo and deployment

- Student demo: register or sign in, preview the tools, then use **Subscription & payments → Subscribe with demo payment**. Success unlocks the tools for the demo subscription period. See [demo payments](DEMO_PAYMENTS.md) and [career choice and skill requests](CAREERS_AND_SKILL_REQUESTS.md).
- Administrator demo: open `/admin` with the demo administrator account. Review skill requests, publish questions and inspect enrollments or payments.
- For Cloudflare sharing on Windows, build the client first. The included `share` script expects `cloudflared.exe` under `.local/cloudflare` and either a running local MongoDB listener on port 27018 or `mongod.exe` under `.local/mongodb/bin`. If you use that local database, set `MONGODB_URI=mongodb://127.0.0.1:27018/path_pilot`. [Classroom sharing guide](CLOUDFLARE_DEMO.md).
- The archive includes the Vercel adapter and build configuration. A deployed API needs a MongoDB instance it can reach and server environment variables for `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `COOKIE_SECURE=true` and `PAYMENT_MODE=simulation` for demo checkout. [Vercel guide](deploy/VERCEL_GUIDE.md).
- Razorpay test mode is optional. [Razorpay setup notes](docs/PREMIUM_SETUP.md).

## Development

- `client/` contains the Angular interface.
- `server/` contains the Express API, Mongoose models and backend tests.
- `tests/` contains the Playwright browser tests.
- `npm test` runs the backend suite. Build the client and install Playwright Chromium with `npx playwright install chromium` before running `npm run test:e2e`. The test harness uses a separate database.
- See the [architecture](docs/ARCHITECTURE.md) and [requirements](docs/REQUIREMENTS.md) for the original project design.
