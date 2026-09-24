const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHistoricalEvents } = require("../src/backfill");

test("generates historical journeys across the requested range", () => {
  const result = buildHistoricalEvents({
    start: "2026-01-01T00:00:00.000Z",
    end: "2026-01-03T00:00:00.000Z",
    journeysPerDay: 2,
  });

  assert.equal(result.journeys, 4);
  assert.ok(result.events.length >= 12);
  assert.ok(result.events.every((event) => event.labels.generation === "historical"));
  assert.ok(result.events.every((event) => new Date(event["@timestamp"]) >= result.start));
  assert.ok(result.events.every((event) => new Date(event["@timestamp"]) <= result.end));
});

test("produces stable identifiers for an idempotent rerun", () => {
  const options = {
    start: "2026-01-01T00:00:00.000Z",
    end: "2026-01-02T00:00:00.000Z",
    journeysPerDay: 3,
    seed: "test-seed",
  };
  const first = buildHistoricalEvents(options);
  const second = buildHistoricalEvents(options);

  assert.deepEqual(
    first.events.map((event) => event.event.id),
    second.events.map((event) => event.event.id),
  );
  assert.deepEqual(
    first.events.map((event) => event["@timestamp"]),
    second.events.map((event) => event["@timestamp"]),
  );
});

test("rejects excessive history and invalid daily volume", () => {
  assert.throws(
    () => buildHistoricalEvents({ start: "2020-01-01", end: "2026-01-01" }),
    /limited to 730 days/,
  );
  assert.throws(
    () => buildHistoricalEvents({ start: "2026-01-01", end: "2026-01-02", journeysPerDay: 0 }),
    /journeysPerDay/,
  );
});
