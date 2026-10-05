const crypto = require("node:crypto");
const { createCheckoutEvents } = require("./events");

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDate(value, fieldName) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new TypeError(`${fieldName} is not a valid date.`);
  return date;
}

function hashHex(value, length) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, length);
}

function seededRandom(seed) {
  let call = 0;
  return () => {
    const digest = crypto.createHash("sha256").update(`${seed}:${call++}`).digest();
    return digest.readUInt32BE(0) / 0x1_0000_0000;
  };
}

function buildHistoricalEvents(options = {}) {
  const start = parseDate(options.start || "2026-01-01T00:00:00.000Z", "start");
  const requestedEnd = parseDate(options.end || new Date(), "end");
  const end = new Date(Math.min(requestedEnd.valueOf(), Date.now()));
  const journeysPerDay = Number(options.journeysPerDay ?? 4);
  const seed = String(options.seed || "ayn-al-sijill-2026-baseline");

  if (start > end) throw new RangeError("start must be earlier than end.");
  if (!Number.isInteger(journeysPerDay) || journeysPerDay < 1 || journeysPerDay > 24) {
    throw new RangeError("journeysPerDay must be an integer from 1 to 24.");
  }
  const dayCount = Math.ceil((end - start) / DAY_MILLISECONDS);
  if (dayCount > 730) throw new RangeError("Historical generation is limited to 730 days.");

  const events = [];
  let journeys = 0;
  for (let dayStart = start.valueOf(); dayStart < end.valueOf(); dayStart += DAY_MILLISECONDS) {
    const dayEnd = Math.min(dayStart + DAY_MILLISECONDS, end.valueOf());
    const dayLabel = new Date(dayStart).toISOString().slice(0, 10);
    for (let index = 0; index < journeysPerDay; index += 1) {
      const journeyKey = `${seed}:${dayLabel}:${index}`;
      const random = seededRandom(journeyKey);
      const occurredAt = dayStart + Math.floor(random() * Math.max(1, dayEnd - dayStart - 1_000));
      const result = createCheckoutEvents({
        now: occurredAt,
        random,
        historical: true,
        orderId: `ORD-HIST-${dayLabel.replaceAll("-", "")}-${String(index + 1).padStart(2, "0")}`,
        traceId: hashHex(`${journeyKey}:trace`, 32),
        transactionId: hashHex(`${journeyKey}:transaction`, 16),
        customerId: `demo-customer-${1 + Math.floor(random() * 500)}`,
        idFactory: (eventIndex) => hashHex(`${journeyKey}:event:${eventIndex}`, 64),
      });
      events.push(...result.events);
      journeys += 1;
    }
  }

  return { events, journeys, start, end };
}

module.exports = { buildHistoricalEvents, seededRandom };
