const { app } = require("@azure/functions");
const { createCheckoutEvents } = require("./events");
const { handleIncidents, secureEqual } = require("./incidents");
const { publishEvents } = require("./publish");
const { notifyCheckoutFailure } = require("./telegram");

async function requestBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function runCheckout(request, context, forcedScenario) {
  if (!secureEqual(request.headers.get("x-ayn-shop-token"), process.env.SHOP_API_TOKEN)) {
    return { status: 401, jsonBody: { error: "unauthorized" } };
  }
  try {
    const body = await requestBody(request);
    const result = createCheckoutEvents({
      scenario: forcedScenario || body.scenario,
      customerId: body.customer_id,
      items: body.items,
      amount: body.amount,
      traceId: request.headers.get("x-trace-id"),
    });
    await publishEvents(result.events, context);
    await notifyCheckoutFailure(result, context);
    context.log(`scenario=${result.response.body.scenario} order.id=${result.response.body.order_id} events=${result.events.length}`);
    return { status: result.response.statusCode, jsonBody: result.response.body };
  } catch (error) {
    context.error("Checkout simulation failed", error);
    return { status: error instanceof TypeError ? 400 : 502, jsonBody: { error: error.message } };
  }
}

app.http("shopHealth", {
  route: "shop/health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, jsonBody: { status: "ok" } }),
});

app.http("shopCheckout", {
  route: "shop/checkout",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: (request, context) => runCheckout(request, context),
});

app.http("shopGhostOrder", {
  route: "shop/demo/ghost-order",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: (request, context) => runCheckout(request, context, "ghost-order"),
});

app.timer("randomShopTraffic", {
  schedule: process.env.EVENT_SCHEDULE || "0 */2 * * * *",
  handler: async (_timer, context) => {
    const result = createCheckoutEvents();
    await publishEvents(result.events, context);
    await notifyCheckoutFailure(result, context);
    context.log(`Generated ${result.response.body.scenario} order ${result.response.body.order_id}.`);
  },
});

app.http("incidentExport", {
  route: "incidents",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: handleIncidents,
});

module.exports = { requestBody, runCheckout };
