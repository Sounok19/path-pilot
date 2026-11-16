# Vercel edition validation

Updated and validated locally on 1 October 2026 using Node.js 24. See `docs/PREMIUM_TEST_REPORT.md` for the full update results.

- Optimized Angular build: passed.
- Four Vercel adapter integration tests: passed against an isolated real MongoDB process, including raw webhook signature verification through the Express adapter.
- Coverage includes session login, profile access, server-side test scoring, hidden answer keys, API 404s, concurrent connection reuse, retry after connection failure, secure/HttpOnly cookies, and student denial of admin access.
- Configuration instance check against the downloaded official Vercel configuration schema: no configuration errors. The upstream schema has a meta-schema inconsistency, so its own schema validation was skipped.
- Original application verification is recorded separately in `docs/TEST_REPORT.md`.

To repeat the adapter checks after installing dependencies:

```text
node --test deploy/vercel-adapter.test.mjs
```

The test dependency may download a MongoDB binary on its first run. It does not use your Atlas deployment.

No live Vercel deployment or Atlas connection was performed. Confirm cloud routing, environment variables, Atlas network access, and sign-in using the checklist in `deploy/VERCEL_GUIDE.md` after deployment. In-memory rate limits are per function instance and are unsuitable as a distributed production control.
