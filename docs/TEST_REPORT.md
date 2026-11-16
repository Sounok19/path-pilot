# Verification report

Validation date: **29 September 2026**.

## Observed results

| Check | Result | Scope |
| --- | --- | --- |
| Angular optimized build | **Passed** | Strict TypeScript/templates; initial output about 270 KB, estimated transfer 75 KB; lazy page chunks |
| Backend integration suite | **12 / 12 passed** | Real isolated MongoDB 7.0.24, Node 24.19.0; final run about 20 seconds |
| Browser workflow suite | **5 / 5 passed** | Installed Microsoft Edge through Playwright; final run 37.1 seconds |
| Desktop visual review | **Passed** | Dashboard and guidance/admin captures; 1440-pixel viewport |
| Mobile visual/layout review | **Passed** | Login and fresh-student dashboard; 390-pixel viewport; dashboard/guidance overflow checks |
| Local performance sample | **Passed for tested workload** | 200 authenticated reads, concurrency 10; p95 **562 ms**, maximum **2,116 ms**, SRS p95 threshold 3,000 ms |
| npm dependency advisory check | **0 reported advisories** | Snapshot of the resolved dependency tree during validation; not a guarantee against future advisories |

The build used the normal native Angular/esbuild toolchain. This restricted Windows environment needed a temporary drive mapping of the same workspace to avoid an inaccessible ancestor-folder lookup; the application did not require code changes for that mapping. No such mapping is part of the delivered project.

## Backend test cases

1. Protected endpoints require authentication; custom request header and cross-site checks; students denied admin functions and admins denied student-only functions.
2. Registration rejects invalid input and role escalation, normalizes email, rejects duplicates, hashes passwords, and issues an HTTP-only SameSite cookie; invalid login rejected.
3. Profile changes persist; invalid CGPA and duplicate skills are rejected; stale versions return 409; another student's profile remains isolated.
4. Skills, learning topics, and goals can be created, edited, completed, and removed.
5. New attempts hide answer keys; attempts enforce ownership; invalid/incomplete/tampered submissions are rejected; valid answers are scored and stored; repeated submission rejected.
6. Two concurrent submissions produce one success and one conflict.
7. Simulated external outage returns local fallback without changing stored results.
8. Simulated successful provider response is decoded/validated; provider rate-limit response falls back safely.
9. Admin can add/deactivate a question; inactive questions are excluded from future selection; students cannot manage questions; hashes absent from student directory.
10. Analytics and guidance respond to recorded evidence, goals and interests; new-user readiness stays zero without evidence.
11. Data remains available after database disconnect/reconnect.
12. Invalid IDs and JSON return controlled errors; logout removes session access.

## Browser workflows

1. Student signs in, edits academic profile, saves/reloads, records a learning topic, and adds a career goal.
2. Student starts a skill test, answers questions, reloads with a retained draft, submits, reviews feedback, opens performance and career guidance, and finds an official learning-resource link.
3. External quiz outage displays a notice and a usable five-question local test.
4. Administrator adds and deactivates a question through the interface.
5. Mobile student registers, sees empty-state guidance, navigates without page overflow, is denied the admin route, and signs out.

The tests revealed and resolved an interaction between critical-CSS inlining and the security policy. The final build serves its stylesheet directly and the browser tests verify that the desktop sidebar is styled.

## Not verified in this environment

- **Docker runtime / Compose startup:** Docker is not installed here. Docker files are included and were reviewed, but the container path should be tried on the lab machine.
- **Live Open Trivia DB response:** provider success, malformed/rate-limited responses, and outages were tested through controlled fixtures. Live availability is not guaranteed. No external API key is required.
- **MongoDB Atlas, deployment, OS restart, backup recovery, multiple servers, or large cohorts:** not exercised. The included local workload does not establish production capacity.
- **All resource links:** browser tests verify the rendered link destination; they do not enroll in or validate third-party courses.
- **Accessibility certification:** labeled inputs, visible focus, semantic controls, status messages, responsive layouts and chart tables are included, but there was no formal audit.

## Lab demonstration checklist

Use a fresh lab database or retain the sample data intentionally. Keep the database running across the restart check.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Register a new student | Student overview and empty learning state |
| 2 | Save college, degree, year, CGPA and interests | Reload retains values |
| 3 | Add two skills and a topic | Learning progress appears on overview |
| 4 | Add an active career goal | That goal influences guidance ordering |
| 5 | Take a local test and submit | Result, explanations and history record appear |
| 6 | Change progress and take another test | Analytics and estimates reflect the new evidence |
| 7 | Set `ENABLE_EXTERNAL_QUIZZES=false`, restart, try external practice | Local fallback is clearly explained |
| 8 | Attempt `/admin` as a student | Redirect to student overview; admin API rejects access |
| 9 | Sign in as admin, create/deactivate a question | Only active questions are used for new tests |
| 10 | Restart the normal application and sign in again | Previously saved profile and results remain |
| 11 | Open at phone width | Navigation, forms and results remain usable |
| 12 | Explain the recommendation formula | Readiness, gap, goal bonus, evidence limits are clear |

To repeat automated checks, follow the test commands in the root README. Browser tests and API tests use temporary databases, not the normal configured lab database.
