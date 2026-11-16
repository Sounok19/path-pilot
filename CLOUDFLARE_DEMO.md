# Share Path Pilot with Cloudflare

Open this folder in VS Code and run in the terminal:

```powershell
npm.cmd run share
```

Copy the `https://...trycloudflare.com` address printed in the terminal. Open it on another device or share it for your demonstration. No Cloudflare account is required for this temporary Quick Tunnel.

Keep the terminal open, laptop awake, and internet connected. Ctrl+C stops sharing. A new tunnel normally generates a different address. This is a temporary demo link, not permanent hosting.

The same accounts and MongoDB data are used. For the admin panel, sign in with `admin@pathpilot.local` and the `ADMIN_PASSWORD` from your local `.env`, then open `/admin`. Never share `.env` or the admin password publicly.

The script starts the database if needed, serves the already-built app on private port 3002, and runs Cloudflare in the terminal. The public HTTPS session uses secure cookies. The existing local development configuration is preserved. MongoDB remains on private port 27018 and data remains on this laptop.

If the connection fails on your network, stop the tunnel with Ctrl+C and try:

```powershell
& .\.local\cloudflare\cloudflared.exe tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:3002
```

Payment checkout still requires your Razorpay test keys; creating a public URL does not configure the payment gateway.

Cloudflare client downloaded from the official cloudflare/cloudflared GitHub release 2026.9.3; SHA256: `f096265ec2fcbe9bb6e2d64268db167ced3fcbb83d894bdb9e2fcdb26f2ea7e2`.

Documentation: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Apply code updates without changing the link

Leave the Cloudflare terminal open. In a second VS Code terminal in this project folder, run:

```powershell
npm.cmd run share:restart
```

Then refresh the browser. This restarts only the application behind your current tunnel.

## Subscription-only features (3 October 2026)

Unsubscribed students can sign in, browse feature descriptions at /explore, and open Subscription & payments. Profiles, learning, goals, tests/results, analytics, guidance/resources, roadmaps, and report downloads require a verified, unexpired subscription. Expiry or refund locks the tools again without deleting saved records. Admin access remains independent of student subscriptions. Razorpay test credentials are still required before checkout can activate access.
