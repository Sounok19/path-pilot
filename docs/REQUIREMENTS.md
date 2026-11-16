# SRS requirements traceability

Baseline: supplied **Student Career Guidance System SRS**, six pages, dated 19 August 2026. The source is requirements data; template directions inside it are not application instructions. The implementation follows the user's requested **MEAN stack**.

## Functional requirements

| SRS ID | Requirement | Implementation | Verification |
| --- | --- | --- | --- |
| FR-1 | Authenticate students | Registration/login, HTTP-only session cookie, protected API and routes | API authentication/registration tests; browser login/registration |
| FR-2 | Create student profile | Empty profile created for the authenticated owner on first profile access | Registration and isolated profile test |
| FR-3 | Maintain profile | Profile form; version-checked atomic save | Save/reload and stale-update tests |
| FR-4 | Maintain academic information | College, degree, year, CGPA, bio | Profile validation and browser save/reload |
| FR-5 | Maintain skills/development areas | Skill list, confidence 0–100, development notes, removal | API profile tests; learning form |
| FR-6 | Maintain career goals | Career, target date, active/completed state, notes, removal | API add/edit/remove; browser goal workflow |
| FR-7 | Track learning topics | Named topic with related skill and logged hours | API CRUD and browser save/reload |
| FR-8 | Track skills/topics progress | Confidence and progress inputs, dashboard summaries | API bounds; browser learning workflow |
| FR-9 | Access mock tests and external API | Local skill tests plus Open Trivia DB adapter and fallback | API provider success/invalid/outage; browser fallback |
| FR-10 | Submit and evaluate tests | Server-side scoring, exact answer count, atomic state transition | Scoring, tamper rejection, double/concurrent submit tests |
| FR-11 | Store results for history | Attempt documents, history and review screens | API history and browser result review |
| FR-12 | Analyze test and learning data | Scores, question-weighted skill accuracy, topic averages, learning hours | Analytics API calculation tests |
| FR-13 | Display analytics | Metric cards, recent-score chart and equivalent table, skill bars | Browser performance workflow |
| FR-14 | Skill-gap analysis | Recorded evidence compared with career-specific example targets | Guidance calculation test; browser gap table |
| FR-15 | Career/learning recommendations | Ranked career paths and prioritized next-step actions | Guidance test; browser roadmap |
| FR-16 | Tailor recommendations | Skills, topic progress, results, interests, goals, year and CGPA influence output | Guidance evidence/interest/goal test; documented formula |
| FR-17 | External career resources | Relevant links to official learning providers per skill | Browser resource link check; manual provider review recommended |
| FR-18 | Persist student/performance records | MongoDB profiles, embedded tracking/goals, attempts; Docker named volume | Database disconnect/reconnect test; browser reload |
| FR-19 | Authorized administrator functions | Admin-only activity overview, student directory, question CRUD/deactivation | Student denied admin API/route; browser admin workflow |
| FR-20 | Validate student/test data | Strict Zod contracts, numeric/text bounds, canonical skills, dates, ownership | Invalid input, duplicate fields, bad JSON, unauthorized record tests |

## Non-functional requirements

| SRS ID | Implementation / evidence | Qualification |
| --- | --- | --- |
| NFR-1: ≥95% under 3 seconds for normal non-external operations | Included repeatable local performance workload; see test report | SRS does not define concurrency or dataset size. Tested workload is 200 authenticated reads, concurrency 10, sample data. Production capacity remains unverified. |
| NFR-2: authenticated/authorized data protection | Password hashes; cookie session; ownership and role checks; strict input; custom-header CSRF defense; rate limits | HTTPS, authenticated database, backups and deployment configuration needed beyond local lab use |
| NFR-3: intuitive responsive interface | Consistent sidebar/mobile navigation, labeled forms, visible loading/error states, dashboard, accessible tables alongside charts | Desktop and 390-pixel mobile browser checks; no formal user-study or WCAG certification |
| NFR-4: preserve data through normal restarts | Persistent MongoDB / named Docker volume, atomic saves; reconnect validation | Docker restart and full OS-restart behavior should be demonstrated on the lab machine; no disaster-recovery guarantee |
| NFR-5: documented modular components | Separate frontend/backend/database/provider/calculation modules; README/API/design docs and tests | Single Express routing module is intentionally compact for this lab; can split controllers as scope grows |

## Interface requirements

| SRS ID | Implementation |
| --- | --- |
| IR-1 Student interface | Angular login, profile, learning, goals, tests, analytics, and guidance pages |
| IR-2 Administrator interface | Authenticated Angular administration page with server-side role enforcement |
| IR-3 Database interface | Mongoose schemas for Users, Profiles, Questions, Attempts; owner/unique indexes |
| IR-4 External interface | Server-side Open Trivia DB fetch, timeout/validation/fallback; curated external learning links |
| IR-5 Authentication interface | Validated credentials, hashed password comparison, session cookie, login errors |

## Implementation choices where the SRS leaves details open

1. Admin functions are activity counts, basic student directory, and question-bank maintenance. No unrestricted individual student record editor is included.
2. Recommendation targets are explainable illustrative values, not empirical hiring criteria; five example career paths are supplied.
3. Academic fields are college/degree/year/CGPA plus biography/interests; the SRS does not prescribe a mark-sheet schema or document uploads.
4. Tests are untimed formative practice. Scores use equal marks and no negative marking. There is no pass/fail certification.
5. External mock tests use Open Trivia DB's computer category. Specific career-resource APIs were not named by the SRS; resource access uses curated official links.
6. Authenticated student data belongs to the current account; public signup cannot choose its role.
7. Password reset, email verification, counseling appointments, job applications, job scraping, and notification scheduling are not specified and are not implemented.
