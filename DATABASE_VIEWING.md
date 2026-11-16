# View the actual MongoDB records

The updated application opens at **http://127.0.0.1:4300**. Its backend uses port **3001**, and its persistent MongoDB database uses **27018**. The older Docker backend on port 3000 does not have premium routes; the new app deliberately uses a different port.

Start this copy from its VS Code terminal with:

```powershell
npm.cmd run lab
```

## See record counts without installing anything

In a second VS Code terminal, run:

```powershell
npm.cmd run db:status
```

The command connects directly to MongoDB and counts saved documents. On 1 October 2026 it found 2 user accounts, 1 profile, 1 enrollment, 22 questions, 9 test attempts, and 0 payments. Payment records remain empty until a configured checkout is attempted.

## Browse individual records using MongoDB Compass

1. Install/open [MongoDB Compass](https://www.mongodb.com/try/download/compass).
2. Choose **Add New Connection** and paste:

```text
mongodb://127.0.0.1:27018/path_pilot
```

3. Choose **Save & Connect**, then open database **path_pilot**.
4. Open a collection and its **Documents** tab:

| Collection | Saved information |
| --- | --- |
| users | Student/admin identity and password hashes |
| profiles | College, degree, skills, learning topics, goals |
| enrollments | Student enrollment number and date |
| questions | Practice question bank |
| attempts | Mock tests, answers and scores |
| payments | Premium checkout/payment records |

Connection procedure reference: [MongoDB Compass documentation](https://www.mongodb.com/docs/compass/connect/).

## Demonstrate persistence in class

Open a profile in the app, change a field, and click Save. In Compass, open **profiles** and refresh the documents to see the saved value. Sign out and sign in again: the field should still have the value you saved. After completing a mock test, refresh **attempts** to see its stored result. The data stays in `.local/mongodb/data` across application restarts.

The local database is on your laptop, so its records do not appear in the MongoDB Atlas website. Compass can inspect this local instance directly. The previous database on port 27017 was left intact; use **27018** to inspect this updated project's data.
