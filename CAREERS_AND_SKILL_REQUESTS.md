# Career choice and student skill requests

## Career roadmap

Subscribing unlocks the tools without choosing a career. A new student sees **Choose your career direction** instead of a full-stack roadmap. Open **My profile → Career for my roadmap**, choose a career, and save. The next visit to **Subscription & payments** builds the roadmap for that choice.

An explicit roadmap choice takes priority. If it is blank, a single existing active goal (or, with no active goals, a single career interest) can provide the direction. Ambiguous choices require a selection. Empty or tied evidence no longer produces a first-in-the-list recommendation. Existing student interests, goals, progress, and payments are preserved; the seeded demonstration student may still have its previously saved full-stack interest and goal. Change its roadmap choice in My profile to demonstrate another direction.

## Request and review a skill

1. A subscribed student opens **Learning tracker**. The existing **Add skill** dropdown continues to show approved skills.
2. Select **Request another skill**, enter the skill name, choose its domain, explain what you want to learn, and submit.
3. **My skill requests** shows Pending until an administrator reviews it.
4. The administrator opens **Skill requests**, reads the proposal, adds a review note, and approves or rejects it.
5. An approved skill becomes available in the shared skill and learning-topic dropdowns. The student clicks **Refresh requests**, adds the skill, and saves learning progress. Approval does not silently change their profile.
6. The admin clicks **Add test questions for [skill]**. The question editor opens with that skill selected. Add a question with four options, the correct answer, an explanation, and Active availability. Repeat to build the test bank.
7. After active questions are published, the student refreshes requests and clicks **Practise [skill]**. The test selector chooses the requested skill. Tests use up to five available questions; answers are graded on the server and results are saved.

Approved skills show **Tests are being prepared by the admin** until an active question exists. Pending and rejected skills cannot be added to a profile, used in questions, or started as tests by calling the API directly. Rejected requests show the admin's feedback. Names are compared without letter case and extra whitespace to avoid duplicate requests; a skill name has one shared review record.

Student requests are visible only to the requesting student and administrators. Approved skill names become available to all subscribed students. The `skillrequests` MongoDB collection stores proposals, decisions, review notes, reviewer IDs, and review dates. `questions` and `attempts` store the resulting practice content and results. New skills appear in performance analytics; they do not automatically change the fixed career curriculum targets.

## Apply the update

Leave your Cloudflare terminal running. In a second VS Code terminal inside this project folder:

```powershell
npm.cmd run share:restart
```

Confirm with Y if prompted, then refresh the browser with Ctrl+Shift+R. No reseeding or database reset is required.
