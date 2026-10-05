const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildIncidentUrl,
  buildTelegramMessage,
  incidentProfile,
  notifyCheckoutFailure,
  sendTelegramAlert,
} = require("../src/telegram");

function checkoutResult(statusCode = 500) {
  return {
    response: {
      statusCode,
      body: {
        scenario: statusCode < 400 ? "success" : "ghost-order",
        order_id: "ORD-123",
        trace_id: "trace-123",
      },
    },
    events: [{
      "@timestamp": "2026-09-22T12:00:00.000Z",
      message: "Order creation failed",
      event: { action: "ORDER_CREATE_FAILED", outcome: "failure" },
      error: { message: "Database <timeout>" },
      log: { level: "ERROR" },
      service: { name: "order-service" },
      payment: { amount: 149.5, currency: "SAR", status: "authorized" },
      product: { sku: "AYN-BOOK-01", count: 3 },
    }],
  };
}

test("formats an HTML-safe incident message", () => {
  const message = buildTelegramMessage(checkoutResult(), {
    APP_ENV: "test",
    KIBANA_PUBLIC_URL: "https://kibana.example.test",
  });

  assert.match(message, /CRITICAL INCIDENT/);
  assert.match(message, /Ghost order detected/);
  assert.match(message, /order-service/);
  assert.match(message, /ORD-123/);
  assert.match(message, /Database &lt;timeout&gt;/);
  assert.match(message, /SAR 149.5/);
  assert.match(message, /Recommended action/);
});

test("assigns scenario severity and builds a filtered incident link", () => {
  assert.equal(incidentProfile(checkoutResult()).severity, "CRITICAL");
  const url = buildIncidentUrl(checkoutResult(), { KIBANA_PUBLIC_URL: "https://kibana.example.test/" });
  assert.match(url, /^https:\/\/kibana\.example\.test\/app\/dashboards#\/view\/ayn-al-sijill-operations/);
  assert.match(decodeURIComponent(url), /trace\.id : "trace-123"/);
  assert.match(decodeURIComponent(url), /2026-09-22T11:55:00\.000Z/);
});

test("does not send alerts for successful checkouts", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => assert.fail("fetch should not be called");

  const result = await sendTelegramAlert(checkoutResult(201), {
    TELEGRAM_BOT_TOKEN: "123:test-token",
    TELEGRAM_CHAT_ID: "456",
  });
  assert.deepEqual(result, { sent: false, reason: "not-an-incident" });
});

test("treats unresolved Key Vault references as disabled", async () => {
  const result = await sendTelegramAlert(checkoutResult(), {
    TELEGRAM_BOT_TOKEN: "@Microsoft.KeyVault(SecretUri=https://example/secrets/token/)",
    TELEGRAM_CHAT_ID: "@Microsoft.KeyVault(SecretUri=https://example/secrets/chat/)",
  });
  assert.deepEqual(result, { sent: false, reason: "not-configured" });
});

test("sends failed checkouts through the Telegram Bot API", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  const result = await sendTelegramAlert(checkoutResult(), {
    TELEGRAM_BOT_TOKEN: "123:test-token",
    TELEGRAM_CHAT_ID: "456",
    APP_ENV: "test",
    KIBANA_PUBLIC_URL: "https://kibana.example.test",
  });

  assert.deepEqual(result, { sent: true });
  assert.equal(request.url, "https://api.telegram.org/bot123:test-token/sendMessage");
  assert.equal(request.options.method, "POST");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.chat_id, "456");
  assert.equal(payload.parse_mode, "HTML");
  assert.match(payload.text, /Ghost order detected/);
  assert.equal(payload.reply_markup.inline_keyboard[0][0].text, "🔎 Investigate in Kibana");
  assert.match(payload.reply_markup.inline_keyboard[0][0].url, /trace-123/);
});

test("contains delivery failures without changing checkout behavior", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({ ok: false, status: 403 });
  const errors = [];

  const result = await notifyCheckoutFailure(checkoutResult(), { error: (message) => errors.push(message) }, {
    TELEGRAM_BOT_TOKEN: "123:test-token",
    TELEGRAM_CHAT_ID: "456",
  });

  assert.deepEqual(result, { sent: false, reason: "delivery-failed" });
  assert.equal(errors.length, 1);
  assert.doesNotMatch(errors[0], /test-token/);
});
