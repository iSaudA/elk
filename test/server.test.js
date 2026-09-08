import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const port = 3101;
let app;

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // It normally takes one or two attempts for Node to start.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("test server did not start");
}

test.before(async () => {
  app = spawn(process.execPath, ["src/server.js"], {
    env: { ...process.env, PORT: String(port), LOGSTASH_HOST: "127.0.0.1", LOGSTASH_PORT: "59999" },
    stdio: "ignore",
  });
  await waitForServer();
});

test.after(() => app?.kill("SIGTERM"));

test("health endpoint is ready", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("normal checkout creates an order", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customer_id: "test-customer", items: 2, amount: 99.95 }),
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.status, "confirmed");
  assert.match(body.order_id, /^ORD-/);
});

test("ghost order returns the expected failure", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/demo/ghost-order`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customer_id: "test-customer", items: 1, amount: 49.95 }),
  });
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.status, "payment_captured_order_missing");
  assert.match(body.trace_id, /^[a-f0-9]{32}$/);
});
