const crypto = require("node:crypto");
const sql = require("mssql");

let poolPromise;
let schemaPromise;

function readPath(value, path) {
  return path.split(".").reduce((current, part) => current && current[part], value);
}

function firstText(event, paths, fallback = null) {
  for (const path of paths) {
    const value = readPath(event, path);
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return fallback;
}

function limitedText(event, paths, maximumLength, fallback = null) {
  const value = firstText(event, paths, fallback);
  return value === null ? null : value.slice(0, maximumLength);
}

function secureEqual(actual, expected) {
  if (!actual || !expected) return false;
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function normalizeEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new TypeError("Each request item must be a JSON object.");
  }

  const rawEvent = JSON.stringify(event);
  const eventId = firstText(event, ["event.id", "event_id", "id"])
    || crypto.createHash("sha256").update(rawEvent).digest("hex");
  const timestamp = new Date(firstText(event, ["@timestamp", "timestamp"], new Date().toISOString()));
  if (Number.isNaN(timestamp.valueOf())) throw new TypeError("Event timestamp is invalid.");

  return {
    eventId: eventId.slice(0, 128),
    timestamp,
    orderId: limitedText(event, ["order.id", "order_id"], 128),
    traceId: limitedText(event, ["trace.id", "trace_id"], 128),
    transactionId: limitedText(event, ["transaction.id", "transaction_id"], 128),
    eventAction: limitedText(event, ["event.action", "event_action", "action"], 128, "UNKNOWN"),
    eventOutcome: limitedText(event, ["event.outcome", "event_outcome", "outcome"], 64),
    severity: limitedText(event, ["log.level", "severity", "level"], 64),
    source: limitedText(event, ["service.name", "host.name", "source"], 256, "logstash"),
    message: limitedText(event, ["message"], 2048),
    rawEvent,
  };
}

async function getPool() {
  if (!poolPromise) {
    if (!process.env.SQL_CONNECTION_STRING) throw new Error("SQL_CONNECTION_STRING is not configured.");
    poolPromise = new sql.ConnectionPool(process.env.SQL_CONNECTION_STRING).connect().catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

async function ensureSchema(pool) {
  if (!schemaPromise) {
    schemaPromise = pool.request().batch(`
      IF OBJECT_ID(N'dbo.IncidentEvents', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.IncidentEvents (
          EventId nvarchar(128) NOT NULL PRIMARY KEY,
          EventTimestamp datetime2(3) NOT NULL,
          OrderId nvarchar(128) NULL,
          TraceId nvarchar(128) NULL,
          TransactionId nvarchar(128) NULL,
          EventAction nvarchar(128) NOT NULL,
          EventOutcome nvarchar(64) NULL,
          Severity nvarchar(64) NULL,
          Source nvarchar(256) NULL,
          Message nvarchar(2048) NULL,
          RawEvent nvarchar(max) NOT NULL,
          IngestedAt datetime2(3) NOT NULL CONSTRAINT DF_IncidentEvents_IngestedAt DEFAULT SYSUTCDATETIME()
        );
        CREATE INDEX IX_IncidentEvents_OrderId ON dbo.IncidentEvents(OrderId, EventTimestamp);
        CREATE INDEX IX_IncidentEvents_TraceId ON dbo.IncidentEvents(TraceId, EventTimestamp);
        CREATE INDEX IX_IncidentEvents_Action ON dbo.IncidentEvents(EventAction, EventTimestamp);
      END;
    `).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  await schemaPromise;
}

async function writeEvent(pool, event) {
  await pool.request()
    .input("eventId", sql.NVarChar(128), event.eventId)
    .input("eventTimestamp", sql.DateTime2(3), event.timestamp)
    .input("orderId", sql.NVarChar(128), event.orderId)
    .input("traceId", sql.NVarChar(128), event.traceId)
    .input("transactionId", sql.NVarChar(128), event.transactionId)
    .input("eventAction", sql.NVarChar(128), event.eventAction)
    .input("eventOutcome", sql.NVarChar(64), event.eventOutcome)
    .input("severity", sql.NVarChar(64), event.severity)
    .input("source", sql.NVarChar(256), event.source)
    .input("message", sql.NVarChar(2048), event.message)
    .input("rawEvent", sql.NVarChar(sql.MAX), event.rawEvent)
    .query(`
      UPDATE dbo.IncidentEvents SET
        EventTimestamp=@eventTimestamp, OrderId=@orderId, TraceId=@traceId,
        TransactionId=@transactionId, EventAction=@eventAction,
        EventOutcome=@eventOutcome, Severity=@severity, Source=@source,
        Message=@message, RawEvent=@rawEvent, IngestedAt=SYSUTCDATETIME()
      WHERE EventId=@eventId;
      IF @@ROWCOUNT = 0
        INSERT dbo.IncidentEvents
          (EventId, EventTimestamp, OrderId, TraceId, TransactionId, EventAction,
           EventOutcome, Severity, Source, Message, RawEvent)
        VALUES
          (@eventId, @eventTimestamp, @orderId, @traceId, @transactionId, @eventAction,
           @eventOutcome, @severity, @source, @message, @rawEvent);
    `);
}

async function handleIncidents(request, context) {
  if (!secureEqual(request.headers.get("x-ayn-token"), process.env.ANALYTICS_INGEST_TOKEN)) {
    return { status: 401, jsonBody: { error: "unauthorized" } };
  }

  try {
    const pool = await getPool();
    await ensureSchema(pool);
    if (request.method === "GET") {
      const eventId = request.query.get("event_id");
      if (!eventId) return { status: 200, jsonBody: { status: "ready" } };
      const result = await pool.request()
        .input("eventId", sql.NVarChar(128), eventId)
        .query("SELECT TOP (1) EventId, EventAction, EventTimestamp, IngestedAt FROM dbo.IncidentEvents WHERE EventId=@eventId");
      return result.recordset.length
        ? { status: 200, jsonBody: result.recordset[0] }
        : { status: 404, jsonBody: { error: "not_found" } };
    }

    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0 || items.length > 500) {
      return { status: 400, jsonBody: { error: "Request must contain 1 to 500 events." } };
    }
    const normalized = items.map(normalizeEvent);
    for (const event of normalized) await writeEvent(pool, event);
    return {
      status: 202,
      jsonBody: { accepted: normalized.length, event_ids: normalized.map((event) => event.eventId) },
    };
  } catch (error) {
    context.error("Analytics ingestion failed", error);
    return { status: error instanceof TypeError ? 400 : 500, jsonBody: { error: error.message } };
  }
}

module.exports = { handleIncidents, normalizeEvent, secureEqual };
