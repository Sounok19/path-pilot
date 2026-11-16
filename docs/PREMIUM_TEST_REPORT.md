# Premium and enrollment verification

Date: 1 October 2026. Environment: Windows, Node.js 24, Angular production build, Microsoft Edge via Playwright, isolated real MongoDB process.

| Verification | Result |
| --- | --- |
| Optimized Angular production build | Passed; approximately 286.69 kB initial JavaScript/CSS, 79.83 kB estimated transfer |
| Existing backend integration suite | 12 passed |
| New payment/enrollment integration suite | 10 passed |
| Vercel adapter integration suite | 4 passed |
| Existing browser journeys | 5 passed |
| New premium/admin/mobile browser journeys | 3 passed |

The backend and adapter suites cover 26 checks in total. The browser suites cover 8 journeys. After a browser selector correction, the three premium journeys were rerun and passed; the five baseline journeys passed in the preceding run. No final failing test remains.

## Payment and enrollment checks

- Persistent enrollment IDs, idempotent migration, administrator search and role checks.
- Server-authoritative pricing, rejection of client-supplied amounts, reuse of a pending order.
- Invalid signatures and cross-student verification/status requests rejected.
- Captured payments activate a fixed term; concurrent callbacks/webhooks and replays do not extend it.
- Authorized-only, failed, wrong-amount, wrong-currency and wrong-order payments do not unlock access.
- Webhook authentication uses original body bytes and does not depend on browser cookies/CSRF headers.
- Manual status refresh recovers a missed callback.
- Processed refunds revoke access; late capture notifications cannot restore a refunded record.
- Expired membership cannot fetch a premium report; a new term can be purchased.
- Provider outage recovery, disabled checkout, live-key rejection and secret exclusion from API responses.
- Administrator payment register is inaccessible to students.
- The Express Vercel adapter preserves whitespace-sensitive webhook signatures.

## Browser and visual checks

The browser tests cover upgrade through a signed checkout callback, access after reload, report download, administrator enrollment search/filtering, payment register, checkout dismissal and mobile page width. Screenshots of the new pages were reviewed for desktop and mobile layout. Screenshots in `docs/screenshots/` use fixture payment IDs and are not evidence of a real gateway transaction.

## Repeating the checks

```text
npm ci
npm run build
npm test
node --test deploy/vercel-adapter.test.mjs
npx playwright install chromium
npm run test:e2e
```

The first integration test run may download a MongoDB binary. Tests use their own database and never connect to the configured Atlas database. To use an installed Edge executable instead of downloading Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its full path before the browser command.

## What has not been verified

The provider is simulated in automated tests. Browser tests replace only the external checkout script and use a test-only fixture endpoint to create a signed response; the normal backend verification and database writes still run. Those fixture routes exist only in `scripts/test-server.mjs`, not in the production server or Vercel entrypoint.

No real Razorpay test account, live Razorpay account, hosted Atlas database or deployed Vercel URL was available during verification. Add your own test credentials, perform a genuine Razorpay test-mode payment, and verify public webhook delivery before presenting the gateway as connected. No live charge was attempted. Load/performance measurements from the baseline report were not repeated for the new billing endpoints.
