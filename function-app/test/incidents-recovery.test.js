const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function reportingWorker({ connectionFailures = 0, schemaFailures = 0 } = {}) {
  const attempts = { connection: 0, schema: 0 };
  const pool = {
    request: () => ({
      batch: async () => {
        attempts.schema += 1;
        if (attempts.schema <= schemaFailures) throw new Error("Temporary schema failure");
      },
    }),
  };
  const sql = {
    ConnectionPool: class {
      async connect() {
        attempts.connection += 1;
        if (attempts.connection <= connectionFailures) throw new Error("Temporary connection failure");
        return pool;
      }
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/incidents.js"), "utf8"), {
    module,
    require: (name) => name === "mssql" ? sql : require(name),
    process: { env: { SQL_CONNECTION_STRING: "synthetic", ANALYTICS_INGEST_TOKEN: "test-token" } },
    Buffer,
  });
  const request = { method: "GET", headers: new Map([["x-ayn-token", "test-token"]]), query: new Map() };
  return { attempts, read: () => module.exports.handleIncidents(request, { error() {} }) };
}

test("reporting retries a failed connection and shares successful initialization", async () => {
  const worker = reportingWorker({ connectionFailures: 1 });
  const failed = await Promise.all([worker.read(), worker.read()]);
  assert.deepEqual(failed.map((response) => response.status), [500, 500]);
  assert.equal(worker.attempts.connection, 1);
  assert.equal((await worker.read()).status, 200);
  assert.equal((await worker.read()).status, 200);
  assert.deepEqual(worker.attempts, { connection: 2, schema: 1 });
});

test("reporting retries failed schema creation without reconnecting a healthy pool", async () => {
  const worker = reportingWorker({ schemaFailures: 1 });
  assert.equal((await worker.read()).status, 500);
  assert.equal((await worker.read()).status, 200);
  assert.equal((await worker.read()).status, 200);
  assert.deepEqual(worker.attempts, { connection: 1, schema: 2 });
});
