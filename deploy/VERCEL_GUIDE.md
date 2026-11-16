# Deploy Path Pilot to Vercel + MongoDB Atlas

For this premium/enrollment update, read the root README first. It includes the extra Razorpay test environment settings, webhook setup and non-destructive enrollment migration.

This edition serves the Angular interface and Express API from **one Vercel URL**, with persistent data in **MongoDB Atlas**. It includes the function entrypoint, connection reuse, API routing, Angular page fallbacks, security headers, and a one-time demo provisioning command.

Use a personal **Vercel Hobby** account for this non-commercial student demonstration and an Atlas **Free (M0)** cluster. Stay within both providers' free quotas; do not select a Pro trial or paid database tier. [Vercel Hobby](https://vercel.com/docs/plans/hobby) · [Atlas Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/).

## 1. Extract this Vercel package

Extract `Path_Pilot_Premium_Enrollment.zip`. Open the `path-pilot-premium` folder. Its top level contains `vercel.json`, `package.json`, `api`, `client`, and `server`.

Keep the earlier local version as a backup. This package uses an Express function rather than a Docker container for the hosted backend; the included original Docker files are only for local development.

## 2. Create the Atlas database

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a **Free/M0** cluster, not a paid tier. You do not need Atlas's large sample datasets.
3. Under **Database Access**, create a dedicated database username and a strong password. Grant `readWrite` access to database **`path_pilot`**; it does not need administrator access to all databases.
4. Open **Connect → Drivers → Node.js** and copy the URI. Replace its username/password placeholders, and use `path_pilot` between the final host slash and the query string:

```text
mongodb+srv://YOUR_DB_USER:YOUR_URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/path_pilot?retryWrites=true&w=majority
```

Use the hostname actually supplied by Atlas. URL-encode special characters in the password; this is the database-user password, not your Atlas website password. Keep the URI private.

5. Under **Network Access**, permit the clients that will connect. Vercel's standard outbound addresses are dynamic, so a free classroom setup commonly uses Atlas's **Allow access from anywhere**, `0.0.0.0/0`. This allows connection attempts from any IP; retain the strong, database-scoped user and use only demo data. Remove the broad rule when the demo is retired. Static Vercel egress is a paid networking feature. [Vercel outbound networking](https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address).

Your laptop also needs network permission for the one-time provisioning command below. The temporary any-IP rule covers it; otherwise add its current public IP separately.

## 3. Create the demo data once, from your laptop

Install **Node.js 24 LTS**. MongoDB does not need to be installed locally because this step connects to Atlas.

Open a terminal in the extracted `path-pilot-premium` folder:

```text
npm ci
npm run setup
```

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

Edit the generated `.env` file. Keep the generated `JWT_SECRET` and set:

```dotenv
MONGODB_URI=your-complete-Atlas-connection-string
NODE_ENV=development
COOKIE_SECURE=false
DEMO_PASSWORD=your-own-student-password
ADMIN_PASSWORD=a-different-admin-password
```

Replace the example values with your own. Both account passwords must be at least 10 characters and no more than 72 UTF-8 bytes. The provisioning script rejects the old public sample password and requires distinct student/admin passwords.

Run:

```text
node deploy/provision.mjs
```

This adds original practice questions, sample profile data, sample test results, and these accounts:

| Account | Email | Password |
| --- | --- | --- |
| Student | `student@pathpilot.local` | The `DEMO_PASSWORD` you chose |
| Administrator | `admin@pathpilot.local` | The `ADMIN_PASSWORD` you chose |

Re-running this explicit command reapplies the passwords to these two fixed sample accounts while preserving existing profile/results and existing edited questions. Ordinary deployment and page loads do not seed or reset data.

**Do not upload `.env`.** It is excluded by both `.gitignore` and `.vercelignore`.

## 4. Upload source to GitHub

Create a repository under your personal GitHub account and upload the project contents. Keep `vercel.json` and `package.json` at the repository root. Do not upload the ZIP as the application, or nest everything under an extra outer folder.

Exclude `.env`, `node_modules`, `.angular`, and test output. If using Git commands, the supplied `.gitignore` handles these. Browser uploads require you to omit them yourself.

## 5. Import the repository into Vercel

Open [Vercel New Project](https://vercel.com/new), import your repository, and use:

| Setting | Value |
| --- | --- |
| Plan/account | Hobby, personal non-commercial use |
| Root Directory | Repository root, where `vercel.json` is located |
| Framework Preset | **Other** — deliberately set by this package |
| Node.js version | **24.x** |
| Install command | `npm ci --include=dev` |
| Build command | `npm run build` |
| Output Directory | `client/dist/path-pilot/browser` |

`vercel.json` already provides the install/build/output values. Do not change the Root Directory to `client`: that would leave the backend outside the deployment. No Start Command, public port, or Docker setting is needed.

Add these Vercel **Environment Variables** before deploying:

| Name | Value |
| --- | --- |
| `MONGODB_URI` | Your complete Atlas URI, including database `path_pilot` |
| `JWT_SECRET` | The random secret created by `npm run setup`, or a fresh random string of at least 32 characters |
| `NODE_ENV` | `production` |
| `COOKIE_SECURE` | `true` |
| `ENABLE_EXTERNAL_QUIZZES` | `false` for a dependable local-question demo; `true` enables the optional trivia provider |

Apply them to **Production**, and **Preview** too if you will test a preview deployment. They belong to the server environment, not Angular source. The account passwords are already hashed in Atlas and do not need to be uploaded to Vercel. Do not create an `ANGULAR_*`/public environment variable containing the URI.

Click **Deploy**. After deployment, use the **production** HTTPS URL ending in `.vercel.app`. If you change environment variables later, redeploy so the functions receive them.

## 6. Check the deployment before class

1. Open `https://YOUR-PROJECT.vercel.app/api/health`. Expected response: `{"status":"ok"}`.
2. Open the app normally. Sign in as the seeded student, verify the profile, and complete one local mock test.
3. Refresh `/dashboard` directly. It should load the Angular app, not return a platform 404.
4. Open Performance and Career guidance, then sign out and verify administrator access.
5. Test the **production URL** in a private/incognito browser window. If Vercel asks viewers to sign in, check deployment-protection settings or use the public production URL rather than a protected preview.

Database records persist in Atlas across function restarts and redeployments. A cold function or database connection may delay the first request, so open the app before your presentation. Rehearse using sample data and keep the local version ready for internet outages.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Build fails to find the project | Root Directory must contain root `package.json`, `vercel.json`, `api`, `client`, and `server` |
| Angular CLI/compiler missing | Install command must include development dependencies: `npm ci --include=dev` |
| Unsupported Node version | Select Node 24.x; this Angular version is not configured for Node 26 |
| Health endpoint returns 503 | Check Atlas URI, database password encoding, cluster readiness, Atlas Network Access, and Vercel environment-variable scope |
| Login has no sample account / tests have no questions | Run `node deploy/provision.mjs` locally against the **same Atlas URI/database** as Vercel |
| Login fails after successful provisioning | Use your selected password, not `PilotLab2026!`; student/admin passwords are different |
| Browser receives HTML instead of API JSON | Verify the API rewrite is first and `api/index.mjs` is present; do not deploy only `client` |
| Page refresh returns 404 | Retain the final Angular fallback rewrite in `vercel.json` |
| Session works on one URL but not another | Use one production HTTPS hostname consistently; cookies are host-specific |
| API logs mention network or DNS errors | Check Atlas cluster hostname/availability and Network Access; the free function cannot reach a laptop's localhost database |
| New environment values have no effect | Redeploy after updating them |
| Too many requests | Wait for the limit window; in-memory rate limits are per function instance, not a distributed production control |

## What was changed

- `api/index.mjs`: exports a request handler; Vercel owns the HTTP listener.
- `server/src/database.js`: shares pending connections and reuses a small MongoDB pool between warm invocations, retrying after failures.
- `server/src/app.js`: can disable local static serving and acknowledges the proxy environment without trusting arbitrary forwarded IP chains.
- `vercel.json`: builds Angular, publishes its static output, routes `/api/*` to the function, and falls back to Angular for page routes. It also sets static-response security headers.
- `deploy/provision.mjs`: explicitly creates classroom sample data and separate private account passwords.
- Login screen no longer advertises a hard-coded demo password.

No public bootstrap endpoint, automatic database reset, Docker runtime, local filesystem database, or separate frontend API hostname is needed.

## Verification and limits

The optimized Angular build and four adapter integration tests passed locally against a real isolated MongoDB process. The tests cover login, cookies, authorization, stored test scoring, connection reuse, and recovery from connection errors. Original app test results remain in `docs/TEST_REPORT.md`; hosting-specific scope is in `deploy/VALIDATION.md`.

This package has **not** been deployed to your Vercel account or connected to your Atlas account. Platform routing, cloud connectivity, quotas and account settings must be checked in your deployment. Rate limiting is in-process and resets with function instances; a production system should use a shared limiter. The included setup is intended for your lab demonstration.

Official references: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel routing/configuration](https://vercel.com/docs/project-configuration/vercel-json), [Mongoose serverless connection guidance](https://mongoosejs.com/docs/lambda.html).
