# Simulated payments for the lab

This project is now configured with `PAYMENT_MODE=simulation` in `.env`. No Razorpay account, PAN, API keys, card details, or bank account is needed. No money is transferred.

## Start using it

Leave the Cloudflare terminal open. Open a second VS Code terminal in this project folder and run:

```powershell
npm.cmd run share:restart
```

Confirm stopping the old Node process if prompted. Refresh the shared website with Ctrl+Shift+R. If the tunnel has stopped, run `npm.cmd run share` and use the new link it prints.

1. Sign in as a student without an active subscription.
2. Open **Subscription & payments**.
3. Click **Subscribe with demo payment**.
4. Choose **Simulate successful payment**, **Simulate failed payment**, or **Cancel demo payment**.
5. Success activates the subscription for 30 days and unlocks all student tools. Failure and cancellation do not grant access. Start a new demo checkout to retry.
6. Reload to demonstrate that the subscription is saved in MongoDB. Repeated requests cannot extend the original access period.
7. Sign in as admin and open **Payments** to see the student's outcome labelled **Simulation**.

The displayed INR 499 is an example amount. Simulation records in the MongoDB `payments` collection use `provider: "simulation"` and `mode: "simulation"`; outcomes are `paid`, `failed`, or `cancelled`. These are demo records, not proof of a financial transaction or actual revenue. An unfinished checkout remains pending and can be resumed with the subscribe button.

Access expires normally and saved student records are retained. An already subscribed student cannot purchase another term until expiry; use a separate student account to demonstrate another outcome.

## Razorpay later

Razorpay integration is retained. To use it later, finish any pending demo checkout, set `PAYMENT_MODE=razorpay`, configure all three Razorpay test credentials following `docs/PREMIUM_SETUP.md`, and restart the app. The simulation endpoint rejects requests in Razorpay mode. Switching modes does not delete past records or revoke existing subscriptions.

## Verification

Backend checks: `npm.cmd test`.

Simulation browser check (isolated test database):

```powershell
$env:SIMULATION_TEST = 'true'
npm.cmd run test:e2e -- tests/simulation.spec.mjs
Remove-Item Env:SIMULATION_TEST
```
