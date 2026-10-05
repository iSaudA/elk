const TELEGRAM_API_ROOT = "https://api.telegram.org";
const OPERATIONS_DASHBOARD_ID = "ayn-al-sijill-operations";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function configuredValue(value) {
  return value && !value.startsWith("@Microsoft.KeyVault(") ? value : null;
}

function failureDetails(result) {
  const event = result.events.find((item) => item.event?.outcome === "failure" && item.error)
    || result.events.find((item) => item.event?.outcome === "failure")
    || result.events.at(-1);

  return {
    action: event?.event?.action || "CHECKOUT_FAILED",
    eventId: event?.event?.id || null,
    message: event?.error?.message || event?.message || "Checkout failed",
    outcome: event?.event?.outcome || "failure",
    service: event?.service?.name || "checkout-service",
    level: event?.log?.level || "ERROR",
    timestamp: event?.["@timestamp"] || new Date().toISOString(),
  };
}

function incidentProfile(result) {
  const scenario = result.response.body.scenario;
  if (scenario === "ghost-order") {
    return {
      severity: "CRITICAL",
      emoji: "🔴",
      title: "Ghost order detected",
      impact: "Payment captured; order creation failed",
      action: "Trace the transaction in MASAR and reconcile the captured payment.",
    };
  }
  if (scenario === "payment-declined") {
    return {
      severity: "HIGH",
      emoji: "🟠",
      title: "Payment declined",
      impact: "Checkout stopped during payment authorization",
      action: "Review the payment-service response and issuer decline reason.",
    };
  }
  if (scenario === "inventory-shortage") {
    return {
      severity: "MEDIUM",
      emoji: "🟡",
      title: "Inventory shortage",
      impact: "Checkout stopped before payment",
      action: "Review stock levels and the failed inventory reservation.",
    };
  }
  return {
    severity: result.response.statusCode >= 500 ? "CRITICAL" : "HIGH",
    emoji: result.response.statusCode >= 500 ? "🔴" : "🟠",
    title: "Checkout failure",
    impact: "Customer checkout did not complete",
    action: "Inspect the correlated trace in Kibana.",
  };
}

function buildIncidentUrl(result, environment = process.env) {
  const baseUrl = configuredValue(environment.KIBANA_PUBLIC_URL)?.replace(/\/$/, "");
  if (!baseUrl) return null;

  const timestamp = new Date(failureDetails(result).timestamp);
  const center = Number.isNaN(timestamp.valueOf()) ? Date.now() : timestamp.valueOf();
  const from = new Date(center - 5 * 60_000).toISOString();
  const to = new Date(center + 5 * 60_000).toISOString();
  const traceId = result.response.body.trace_id;
  const globalState = encodeURIComponent(`(refreshInterval:(pause:!t,value:0),time:(from:'${from}',to:'${to}'))`);
  const appState = encodeURIComponent(`(query:(language:kuery,query:'trace.id : "${traceId}"'))`);

  return `${baseUrl}/app/dashboards#/view/${OPERATIONS_DASHBOARD_ID}?_g=${globalState}&_a=${appState}`;
}

function buildTelegramMessage(result, environment = process.env) {
  const response = result.response.body;
  const failure = failureDetails(result);
  const profile = incidentProfile(result);
  const payment = result.events.find((event) => event.payment)?.payment;
  const product = result.events.find((event) => event.product)?.product;
  const lines = [
    `${profile.emoji} <b>${profile.severity} INCIDENT</b>`,
    `<b>${escapeHtml(profile.title)}</b>`,
    "",
    `<b>Impact:</b> ${escapeHtml(profile.impact)}`,
    `<b>Service:</b> ${escapeHtml(failure.service)}`,
    `<b>Event:</b> ${escapeHtml(failure.action)}`,
    `<b>Outcome:</b> ${escapeHtml(failure.outcome)} · HTTP ${result.response.statusCode}`,
    `<b>Order:</b> <code>${escapeHtml(response.order_id)}</code>`,
    `<b>Trace:</b> <code>${escapeHtml(response.trace_id)}</code>`,
    `<b>Cause:</b> ${escapeHtml(failure.message)}`,
  ];

  if (payment) {
    lines.push(`<b>Payment:</b> ${escapeHtml(payment.currency || "")} ${escapeHtml(payment.amount ?? "—")} · ${escapeHtml(payment.status || "unknown")}`);
  }
  if (product) {
    lines.push(`<b>Item:</b> ${escapeHtml(product.sku || product.name || "unknown")} × ${escapeHtml(product.count ?? 1)}`);
  }
  lines.push(
    `<b>Environment:</b> ${escapeHtml(environment.APP_ENV || "azure-demo")}`,
    `<b>Detected:</b> ${escapeHtml(failure.timestamp)} UTC`,
    "",
    `<b>Recommended action:</b> ${escapeHtml(profile.action)}`,
  );
  return lines.join("\n");
}

async function sendTelegramAlert(result, environment = process.env) {
  if (result.response.statusCode < 400) return { sent: false, reason: "not-an-incident" };

  const token = configuredValue(environment.TELEGRAM_BOT_TOKEN);
  const chatId = configuredValue(environment.TELEGRAM_CHAT_ID);
  if (!token && !chatId) return { sent: false, reason: "not-configured" };
  if (!token || !chatId) throw new Error("Telegram alerts require both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.");

  const incidentUrl = buildIncidentUrl(result, environment);
  const payload = {
    chat_id: chatId,
    text: buildTelegramMessage(result, environment),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (incidentUrl) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: "🔎 Investigate in Kibana", url: incidentUrl }]],
    };
  }

  const response = await fetch(`${TELEGRAM_API_ROOT}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new Error(`Telegram rejected the alert with HTTP ${response.status}.`);
  return { sent: true };
}

async function notifyCheckoutFailure(result, context = console, environment = process.env) {
  try {
    return await sendTelegramAlert(result, environment);
  } catch (error) {
    context.error(`Telegram alert delivery failed: ${error.message}`);
    return { sent: false, reason: "delivery-failed" };
  }
}

module.exports = {
  buildIncidentUrl,
  buildTelegramMessage,
  escapeHtml,
  incidentProfile,
  notifyCheckoutFailure,
  sendTelegramAlert,
};
