#!/usr/bin/env node
const { buildHistoricalEvents } = require("../function-app/src/backfill");
const { basicAuthorization } = require("../function-app/src/publish");

const url = process.env.LOG_INGEST_URL;
const token = process.env.LOG_INGEST_TOKEN;
const batchSize = Number(process.env.BACKFILL_BATCH_SIZE || 50);

if (!url || !token) {
  console.error("LOG_INGEST_URL and LOG_INGEST_TOKEN are required.");
  process.exit(1);
}
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
  console.error("BACKFILL_BATCH_SIZE must be an integer from 1 to 100.");
  process.exit(1);
}

const history = buildHistoricalEvents({
  start: process.env.BACKFILL_START || "2026-01-01T00:00:00.000Z",
  end: process.env.BACKFILL_END || new Date(),
  journeysPerDay: Number(process.env.BACKFILL_JOURNEYS_PER_DAY || 4),
  seed: process.env.BACKFILL_SEED || "ayn-al-sijill-2026-baseline",
});

async function publishBatch(events) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: basicAuthorization(token),
          "content-type": "application/json",
        },
        body: JSON.stringify(events),
        signal: AbortSignal.timeout(90_000),
      });
      if (response.ok) return;
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Logstash rejected the batch with HTTP ${response.status}.`);
      }
    } catch (error) {
      if (attempt === 8) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
  }
  throw new Error("Historical batch retries were exhausted.");
}

async function main() {
  console.log(
    `Seeding ${history.journeys} journeys (${history.events.length} events) from `
      + `${history.start.toISOString()} to ${history.end.toISOString()}.`,
  );
  for (let offset = 0; offset < history.events.length; offset += batchSize) {
    await publishBatch(history.events.slice(offset, offset + batchSize));
    const completed = Math.min(offset + batchSize, history.events.length);
    console.log(`Published ${completed}/${history.events.length} events.`);
  }
  console.log("Historical seed completed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
