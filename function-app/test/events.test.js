const test = require("node:test");
const assert = require("node:assert/strict");
const { SCENARIOS, chooseScenario, createCheckoutEvents } = require("../src/events");

test("all configured scenarios can be generated", () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    const result = createCheckoutEvents({ scenario, now: "2026-09-20T12:00:00.000Z", random: () => 0.5 });
    assert.equal(result.response.body.scenario, scenario);
    assert.equal(result.events.at(0).event.action, "CHECKOUT_STARTED");
    assert.equal(result.events.at(-1).event.action, "HTTP_REQUEST_COMPLETED");
    assert.ok(result.events.every((event) => event.order.id === result.response.body.order_id));
    assert.ok(result.events.every((event) => event.trace.id === result.response.body.trace_id));
  }
});

test("ghost orders contain the correlated failure evidence", () => {
  const { events } = createCheckoutEvents({ scenario: "ghost-order" });
  const actions = events.map((event) => event.event.action);
  assert.deepEqual(actions, [
    "CHECKOUT_STARTED",
    "INVENTORY_RESERVED",
    "PAYMENT_SUCCESS",
    "ORDER_CREATE_FAILED",
    "DATABASE_TIMEOUT",
    "HTTP_REQUEST_COMPLETED",
  ]);
});

test("weighted selection reaches success and the final scenario", () => {
  assert.equal(chooseScenario(() => 0), "success");
  assert.equal(chooseScenario(() => 0.99999), "inventory-shortage");
});
