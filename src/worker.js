// Demo traffic only: 30 requests/minute and a predictable intentional failure.
// This is a simple sequential generator, not a performance benchmark.
import crypto from "node:crypto";

const TARGET = process.env.WORKER_TARGET || "http://replica-app:3000";
const REQUESTS_PER_MINUTE = Math.max(1, Number(process.env.REQUESTS_PER_MINUTE || 30));
const GHOST_ORDER_EVERY = Math.max(1, Number(process.env.GHOST_ORDER_EVERY || 20));
const intervalMilliseconds = 60_000 / REQUESTS_PER_MINUTE;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForApp() {
  while (true) {
    try {
      const response = await fetch(`${TARGET}/health`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) return;
    } catch {
      // The app may still be starting.
    }
    await sleep(2_000);
  }
}

await waitForApp();
process.stdout.write(`Traffic worker connected to ${TARGET}\n`);

let sequence = 0;
while (true) {
  const startedAt = Date.now();
  // Every twentieth request generates a repeatable failure.
  sequence += 1;
  const ghostOrder = sequence % GHOST_ORDER_EVERY === 0;
  const endpoint = ghostOrder ? "/api/demo/ghost-order" : "/api/checkout";
  const traceId = crypto.randomBytes(16).toString("hex");

  try {
    const response = await fetch(`${TARGET}${endpoint}`, {
      signal: AbortSignal.timeout(10000),
      method: "POST",
      headers: { "content-type": "application/json", "x-trace-id": traceId },
      body: JSON.stringify({
        customer_id: `demo-customer-${(sequence % 50) + 1}`,
        items: (sequence % 4) + 1,
        amount: Number((49.95 + (sequence % 8) * 25).toFixed(2)),
      }),
    });
    process.stdout.write(
      `${new Date().toISOString()} request=${sequence} scenario=${ghostOrder ? "ghost-order" : "normal"} status=${response.status} trace.id=${traceId}\n`,
    );
  } catch (error) {
    process.stderr.write(`${new Date().toISOString()} worker_error=${JSON.stringify(error.message)}\n`);
  }

  await sleep(Math.max(0, intervalMilliseconds - (Date.now() - startedAt)));
}
