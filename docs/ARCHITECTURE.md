# Architecture and design

## Technology choices

| Layer | Implementation |
| --- | --- |
| Client | Angular 20.3, TypeScript 5.9, standalone components, lazy routes, zoneless change detection |
| API | Node.js 24 LTS, Express 5, JSON REST endpoints |
| Data | MongoDB, Mongoose 8 schemas and indexes |
| Authentication | bcrypt password hashing, signed 8-hour JWT in an HTTP-only cookie |
| Validation | Zod schemas, strict request fields, bounds and identifier checks |
| Verification | Node test runner, Supertest, real isolated MongoDB, Playwright |

The application uses a single origin. Express serves the compiled Angular files and the API in a packaged run. During development Angular proxies API traffic to Express. No JWT is stored in browser local storage.

```mermaid
flowchart LR
  S[Student browser] --> A[Angular application]
  M[Administrator browser] --> A
  A -->|Same-origin JSON and session cookie| E[Express API]
  E --> V[Validation and access control]
  V --> DB[(MongoDB)]
  E --> G[Analytics and rule-based guidance]
  G --> DB
  E --> Q[Quiz provider adapter]
  Q -->|4.5 second timeout| O[Open Trivia DB]
  Q -->|Fallback| L[Local question bank]
  L --> DB
  A -->|User opens learning link| R[External learning resources]
```

## Persistent data model

```mermaid
erDiagram
  USER ||--o| PROFILE : owns
  USER ||--o{ ATTEMPT : takes
  QUESTION }o--o{ ATTEMPT : snapshots
  USER {
    ObjectId id PK
    string name
    string email UK
    string passwordHash
    string role
    datetime createdAt
  }
  PROFILE {
    ObjectId user UK
    string college
    string degree
    number year
    number cgpa
    array interests
    array skills
    array topics
    array goals
    number version
  }
  QUESTION {
    ObjectId id PK
    string skill
    string prompt
    array options
    number correctIndex
    string explanation
    boolean active
  }
  ATTEMPT {
    ObjectId user FK
    string source
    string status
    array questionSnapshots
    array answers
    number score
    datetime submittedAt
  }
```

The question-to-attempt edge is conceptual: an attempt embeds a full snapshot rather than a live foreign-key reference. Editing a question cannot change an existing attempt. Profiles embed bounded skills, topics, and goals so one atomic document update saves all related profile changes. Emails and profile owners have unique indexes. Attempts have an index on `(user, createdAt)` for history retrieval.

Profile updates use an explicit version check and atomic increment. The API returns 409 if the submitted version is stale. Test submission atomically changes `in-progress` to `submitted`; racing submissions cannot score the same attempt twice.

## Mock-test sequence

```mermaid
sequenceDiagram
  actor Student
  participant UI as Angular
  participant API as Express
  participant Provider as Quiz adapter
  participant DB as MongoDB
  Student->>UI: Start practice
  UI->>API: POST /api/attempts
  API->>API: Authenticate and validate
  API->>Provider: Obtain questions
  Provider-->>API: Local or external questions
  API->>DB: Save question snapshot and answer key
  API-->>UI: Questions without answer keys
  Student->>UI: Answer all questions
  UI->>API: POST attempt ID /submit, answers
  API->>DB: Read owned attempt
  API->>API: Compute score from stored key
  API->>DB: Atomic submission if still in progress
  API-->>UI: Score, answers and explanations
```

## Separation of responsibilities

- `client/src/app/api.ts`: same-origin requests, session state, typed profile structures, loading/error state.
- Page components: forms, lists, navigation, presentation. No client-provided score or role is trusted.
- `server/src/app.js`: HTTP routing and authorization. Student routes always derive ownership from the verified session, never a client-supplied user ID.
- `validation.js`: strict request contracts. Bounded text, array sizes, scores, dates, and numerical fields.
- `models.js`: database structure and indexes.
- `guidance.js`: pure calculations, independently testable with profile and result inputs.
- `quiz-provider.js`: provider timeout, response checks, URL decoding, attribution, and fallback.
- `catalog.js`: illustrative career paths, skill targets, external resource links, original sample question bank.

## Access and security decisions

JWTs have a fixed issuer, audience, allowed signing algorithm, and an eight-hour expiry. Every request loads the current user from MongoDB and checks their current role. Public registration cannot create or promote administrators. Hashes are excluded from normal database selections and API responses.

State-changing API requests require `X-Requested-With: PathPilot`. The server grants no CORS permissions, rejects requests marked cross-site, and uses SameSite=Strict cookies. Helmet sends content-security and other HTTP headers. Angular uses text interpolation for provider content. Critical-CSS inlining is disabled to avoid generated inline event handlers conflicting with the CSP.

Logout removes the browser cookie; there is no server-side JWT revocation list. A previously stolen token would remain valid until its expiry. Rate limits are in-process and appropriate for one lab server; a multi-instance deployment would need a shared rate-limit store. The project contains no password-recovery or email-verification service.

## Assumptions and limits

- Administrator-level functions are not enumerated in detail by the SRS. This implementation chooses activity counts, a basic student directory, and question-bank management.
- Five example careers and fifteen canonical skills are included. They can be extended in the catalog and corresponding validation/tests.
- Learning progress is self-reported. Tests are untimed practice, with no proctoring or question randomization guarantees beyond a shuffled local selection.
- Recent attempt lists return up to 200 records; admin lists return up to 200 students / 500 questions. Analytics currently process all a student's submitted attempts, so larger datasets need pagination, incremental aggregation, and additional capacity testing.
- External integration is Open Trivia DB for computer trivia plus curated links for learning/career resources. No commercial career API credentials are required.
- Persistent MongoDB storage, or the Docker named volume, preserves data across normal restarts. Backups and disaster recovery are an operator responsibility.
