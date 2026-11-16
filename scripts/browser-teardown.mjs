export default async function teardown() {
  try {
    await fetch('http://127.0.0.1:3100/__test_shutdown', {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
  // Allow the isolated server to close its MongoDB process before Playwright cleanup.
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
