# Run this configured copy in VS Code

This copy is configured for a persistent local MongoDB database. Node.js 24 and npm dependencies are already installed. The local database executable is included under `.local/mongodb/bin` on this computer.

Open this project folder in VS Code, then choose Terminal → New Terminal and run:

```powershell
npm.cmd run lab
```

This starts MongoDB if needed and runs the Angular interface and Express backend. Open **http://127.0.0.1:4300** after the terminal reports readiness. To stop the web application, press Ctrl+C. MongoDB continues running in the background; restarting Windows stops it. Running the same command after a restart starts it again using the saved data.

## Sign-in

- Student: `student@pathpilot.local`; password is the `DEMO_PASSWORD` value in `.env`.
- Administrator: `admin@pathpilot.local`; password is the `ADMIN_PASSWORD` value in `.env`.

Passwords were generated separately for this computer. Do not share or upload `.env`.

## Database

- Address: `mongodb://127.0.0.1:27018/path_pilot`
- Data: `.local/mongodb/data`
- Log: `.local/mongodb/mongod.log`
- Start just the database: `npm.cmd run db:start`

MongoDB is bound to this computer's loopback address, with no public network listener. The `.local` directory is ignored by Git and Vercel. Do not delete it if you want to keep student records. For a backup, stop the database cleanly or use MongoDB backup tooling rather than copying live data files.

This configured local database is separate from any Atlas database and cannot be reached by Vercel. For hosting, follow the main README and configure Atlas. Razorpay checkout remains disabled until your test credentials are configured.

## Inspect stored records

Run `npm.cmd run db:status` in another terminal. See [DATABASE_VIEWING.md](DATABASE_VIEWING.md) for MongoDB Compass connection instructions and a persistence demonstration.

The updated interface uses port 4300 and the backend uses port 3001, avoiding the earlier Docker application on port 3000. The Windows development helper uses an unused temporary drive mapping to avoid protected parent-folder errors; it does not move project files.
