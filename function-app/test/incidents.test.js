const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEvent, secureEqual } = require("../src/incidents");

test("normalizes ECS fields for Azure SQL", () => {
  const result = normalizeEvent({
    "@timestamp": "2026-09-20T12:00:00.000Z",
    event: { id: "evt-1", action: "ORDER_CREATE_FAILED", outcome: "failure" },
    order: { id: "order-1" },
    trace: { id: "trace-1" },
    transaction: { id: "txn-1" },
    service: { name: "replica-shop" },
    log: { level: "error" },
    message: "Order creation failed",
  });

  assert.equal(result.eventId, "evt-1");
  assert.equal(result.orderId, "order-1");
  assert.equal(result.eventAction, "ORDER_CREATE_FAILED");
  assert.equal(result.source, "replica-shop");
});

test("derives a stable event id when no id is supplied", () => {
  const event = { "@timestamp": "2026-09-20T12:00:00.000Z", event: { action: "TEST" } };
  assert.equal(normalizeEvent(event).eventId, normalizeEvent(event).eventId);
});

test("limits text fields to their Azure SQL column sizes", () => {
  const result = normalizeEvent({
    "@timestamp": "2026-09-20T12:00:00.000Z",
    event: { action: "A".repeat(200), outcome: "O".repeat(100) },
    service: { name: "S".repeat(300) },
    message: "M".repeat(3000),
  });

  assert.equal(result.eventAction.length, 128);
  assert.equal(result.eventOutcome.length, 64);
  assert.equal(result.source.length, 256);
  assert.equal(result.message.length, 2048);
});

test("compares ingestion tokens without accepting mismatched lengths", () => {
  assert.equal(secureEqual("secret", "secret"), true);
  assert.equal(secureEqual("secret", "different"), false);
  assert.equal(secureEqual("", "secret"), false);
});
