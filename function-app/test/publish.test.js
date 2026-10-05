const test = require("node:test");
const assert = require("node:assert/strict");
const { basicAuthorization, publishEvents } = require("../src/publish");

test("builds Logstash basic authentication without exposing the token", () => {
  assert.equal(basicAuthorization("secret"), `Basic ${Buffer.from("azure-function:secret").toString("base64")}`);
});

test("publishes an event batch to the configured Logstash endpoint", async (t) => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.LOG_INGEST_URL;
  const originalToken = process.env.LOG_INGEST_TOKEN;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.LOG_INGEST_URL;
    else process.env.LOG_INGEST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.LOG_INGEST_TOKEN;
    else process.env.LOG_INGEST_TOKEN = originalToken;
  });

  process.env.LOG_INGEST_URL = "https://logs.example.test/ingest";
  process.env.LOG_INGEST_TOKEN = "secret";
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  await publishEvents([{ event: { action: "TEST" } }]);
  assert.equal(request.url, process.env.LOG_INGEST_URL);
  assert.equal(request.options.headers.authorization, basicAuthorization("secret"));
  assert.deepEqual(JSON.parse(request.options.body), [{ event: { action: "TEST" } }]);
});
