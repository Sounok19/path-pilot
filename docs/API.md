# REST API reference

Base path: `/api`. JSON request/response bodies. All mutating requests require the header `X-Requested-With: PathPilot`. Browser credentials use a same-origin HTTP-only `pilot_session` cookie; no bearer-token setup is required. CORS is intentionally not enabled.

## Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Database readiness, HTTP 200 or 503 |
| POST | `/auth/register` | Public | Create student and session; 201 |
| POST | `/auth/login` | Public | Verify credentials and create session |
| POST | `/auth/logout` | Public | Clear session cookie; 204 |
| GET | `/auth/me` | Signed in | Current ID, name, email, role |
| GET | `/catalog` | Signed in | Careers, skill names, curated resources |
| GET | `/profile` | Student | Own profile; creates an empty profile if absent |
| PUT | `/profile` | Student | Replace own editable profile fields with version check |
| GET | `/analytics` | Student | Test summary, last 10 result points, skill accuracy, learning data |
| GET | `/guidance` | Student | Ranked careers, gaps, evidence, resources, next steps |
| GET | `/tests` | Student | Active local question counts by skill and external availability setting |
| GET | `/attempts` | Student | Most recent 200 own attempts, excluding question/answer arrays |
| POST | `/attempts` | Student | Save and start a new attempt; 201 |
| GET | `/attempts/:id` | Student owner | Attempt; keys hidden until submitted |
| POST | `/attempts/:id/submit` | Student owner | Evaluate and permanently submit the answers |
| GET | `/admin/overview` | Admin | Student / active question / completed test counts and overall average |
| GET | `/admin/students` | Admin | Most recent 200 student names, emails and join dates |
| GET | `/admin/questions` | Admin | Most recent 500 questions, including keys and active flags |
| POST | `/admin/questions` | Admin | Create validated question; 201 |
| PUT | `/admin/questions/:id` | Admin | Update or deactivate question |

## Request bodies

Registration:

```json
{"name":"Student Name","email":"student@example.com","password":"MyUniquePassword2026!"}
```

Login uses only `email` and `password`. Unknown fields (including `role`) are rejected. Name length: 2–80 characters; email: valid syntax, up to 254 characters; password: 10+ characters and at most 72 UTF-8 bytes.

Profile save (send **all** editable fields):

```json
{
  "version": 0,
  "college": "IEM Kolkata",
  "degree": "B.Tech CSE",
  "year": 3,
  "cgpa": 8.2,
  "bio": "Preparing for internships.",
  "interests": ["full-stack"],
  "skills": [{"name":"JavaScript","level":60,"development":"Async programming"}],
  "topics": [{"id":"c143aada-419b-48e5-b0f5-50588242a333","title":"Promises","skill":"JavaScript","progress":50,"hours":2}],
  "goals": [{"id":"24f8ee2e-d1bd-41ee-b02b-3d23a282955a","careerId":"full-stack","targetDate":"2027-06-30","status":"active","notes":"Build a portfolio"}]
}
```

Read `/profile` first and submit its current `version`. Do not echo read-only `_id`, `user`, `__v`, or timestamps. Skill confidence and topic progress are integer percentages 0–100; CGPA 0–10; study year 1–8; hours 0–10,000. Skills must have unique names from `/catalog`; topic and goal IDs must be unique UUIDs. Maximums: 30 skills, 100 topics, 20 goals. Goal status is `active` or `completed`; target dates must be real calendar dates in `YYYY-MM-DD` form.

Start a test:

```json
{"source":"local","skill":"Mixed"}
```

`source` is `local` or `external`; `skill` is `Mixed` or a catalog skill. External tests use computer trivia regardless of skill. A fallback uses the selected local skill; the frontend chooses Mixed for external requests. Success saves the question snapshot before responding with the attempt ID. If no fallback questions exist, returns 503 without deleting or changing other attempts.

Submit a test:

```json
{"answers":[0,2,1,3,0]}
```

One zero-based option index per question, in displayed order. Array length must match the attempt. A supplied score is rejected. Once submitted, the result includes correct indexes and explanations; repeat submissions return 409. Reading another student's attempt returns 404.

Create/update a question:

```json
{
  "skill":"JavaScript",
  "prompt":"Which keyword declares a block-scoped variable?",
  "options":["let","define","static","global"],
  "correctIndex":0,
  "explanation":"let declares a block-scoped variable.",
  "active":true
}
```

Four distinct nonempty options are required. Prompt length 10–600, each option 1–250, explanation 5–1,000. Set `active:false` to remove a question from future tests while preserving history.

## Premium and enrollment additions (October 2026)

| Method / path | Access | Purpose |
| --- | --- | --- |
| `GET /api/billing` | Student | Current plan, enrollment ID, entitlement and own last 100 payments |
| `POST /api/billing/checkout` | Student | Body `{}`; create or reuse a server-priced Razorpay test order |
| `POST /api/billing/verify` | Student | Verify callback signature and captured payment against the stored owner/order/amount/currency |
| `POST /api/billing/refresh` | Student | Body `{paymentId}`; fetch current gateway status for an owned payment |
| `POST /api/billing/webhook` | Signed provider | Raw JSON; requires valid `X-Razorpay-Signature`, no browser session |
| `GET /api/premium/report` | Premium student | Server-authorized roadmap and report data for the signed-in student |
| `GET /api/admin/enrollments?q=&plan=all&page=1` | Admin | Search name/email; `plan` is `all`, `basic` or `premium`; 20 rows per page |
| `GET /api/admin/payments?page=1` | Admin | Payment register, 20 rows per page |

Verify request fields: `paymentId` (local MongoDB record ID), `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. All are required; unexpected fields are rejected. The browser never supplies an accepted price, duration, membership role or payment status. Billing mutations retain the normal request-protection header. The webhook is separately authenticated by its signature over the original body and is the only exception to browser CSRF checks.

See `PREMIUM_SETUP.md` for the payment state machine, test keys, webhook events, refunds and migration. The existing 200-student directory endpoint remains for compatibility; the new enrollment register is paginated.

## Error response details

Errors have the shape `{"message":"Human-readable explanation"}`. Status codes: 400 invalid input, 401 missing/invalid session, 403 role or request-protection failure, 404 missing/unauthorized record, 409 duplicate/stale/already-submitted conflict, 413 request too large, 429 rate limit, 503 no usable questions or database health failure. Unhandled errors return a generic 500 message and log only the error name.

JSON body limit: 100 KB. Default limits: 180 API requests per minute per IP, and 30 login/registration requests per 15 minutes per IP (failed and successful attempts both count). Test applications override these limits so test traffic is not mistaken for real usage. Production multi-server installations need an external rate-limit store and correctly configured trusted proxies.
