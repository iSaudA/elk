const crypto = require("node:crypto");
const os = require("node:os");

const SCENARIOS = Object.freeze({
  success: { weight: 75, statusCode: 201, status: "confirmed" },
  "ghost-order": { weight: 8, statusCode: 500, status: "payment_captured_order_missing" },
  "payment-declined": { weight: 10, statusCode: 402, status: "payment_declined" },
  "inventory-shortage": { weight: 7, statusCode: 409, status: "inventory_unavailable" },
});

const PRODUCTS = Object.freeze([
  { sku: "AYN-BOOK-01", name: "Field notebook", unitPrice: 49.95 },
  { sku: "AYN-BAG-02", name: "Canvas messenger bag", unitPrice: 129.0 },
  { sku: "AYN-LAMP-03", name: "Desk lamp", unitPrice: 189.5 },
  { sku: "AYN-MUG-04", name: "Ceramic mug", unitPrice: 34.75 },
]);

function randomInteger(minimum, maximum, random = Math.random) {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

function choose(items, random = Math.random) {
  return items[randomInteger(0, items.length - 1, random)];
}

function chooseScenario(random = Math.random) {
  const total = Object.values(SCENARIOS).reduce((sum, value) => sum + value.weight, 0);
  let ticket = random() * total;
  for (const [name, value] of Object.entries(SCENARIOS)) {
    ticket -= value.weight;
    if (ticket < 0) return name;
  }
  return "success";
}

function createCheckoutEvents(options = {}) {
  const random = options.random || Math.random;
  const scenario = options.scenario || chooseScenario(random);
  if (!SCENARIOS[scenario]) throw new TypeError(`Unknown scenario: ${scenario}`);

  const startedAt = new Date(options.now || Date.now());
  if (Number.isNaN(startedAt.valueOf())) throw new TypeError("Checkout timestamp is invalid.");
  const product = options.product || choose(PRODUCTS, random);
  const itemCount = Number(options.items) || randomInteger(1, 5, random);
  const amount = Number(options.amount) || Number((product.unitPrice * itemCount).toFixed(2));
  const traceId = options.traceId || crypto.randomBytes(16).toString("hex");
  const transactionId = options.transactionId || crypto.randomBytes(8).toString("hex");
  const orderId = options.orderId
    || `ORD-${startedAt.getTime().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const customerId = options.customerId || `demo-customer-${randomInteger(1, 500, random)}`;
  let elapsedMilliseconds = 0;
  const events = [];
  const nextEventId = () => options.idFactory ? options.idFactory(events.length) : crypto.randomUUID();

  const add = (service, action, message, fields = {}, delayRange = [5, 40]) => {
    const { level = "INFO", outcome, ...eventFields } = fields;
    elapsedMilliseconds += randomInteger(delayRange[0], delayRange[1], random);
    events.push({
      "@timestamp": new Date(startedAt.getTime() + elapsedMilliseconds).toISOString(),
      message,
      log: { level },
      service: { name: service, version: "2.0.0" },
      event: {
        id: nextEventId(),
        action,
        category: ["web", "transaction"],
        outcome,
      },
      trace: { id: traceId },
      transaction: { id: transactionId },
      order: { id: orderId },
      user: { id: customerId },
      labels: {
        environment: process.env.APP_ENV || "azure-demo",
        dataset: "ayn-al-sijill",
        scenario,
        generation: options.historical ? "historical" : "live",
      },
      cloud: { provider: "azure", service: { name: "functions" } },
      host: { name: process.env.WEBSITE_HOSTNAME || os.hostname() },
      ...eventFields,
    });
  };

  add("checkout-service", "CHECKOUT_STARTED", "Checkout started", {
    http: { request: { method: "POST" } },
    product: { sku: product.sku, name: product.name, count: itemCount },
  });

  if (scenario === "inventory-shortage") {
    add("inventory-service", "INVENTORY_OUT_OF_STOCK", "Requested inventory is unavailable", {
      level: "WARN",
      outcome: "failure",
      product: { sku: product.sku, name: product.name, count: itemCount },
      error: { type: "InsufficientInventory", message: `Not enough stock for ${product.sku}` },
    });
  } else {
    add("inventory-service", "INVENTORY_RESERVED", "Inventory reserved for checkout", {
      outcome: "success",
      product: { sku: product.sku, name: product.name, count: itemCount },
    });
  }

  if (scenario !== "inventory-shortage") {
    if (scenario === "payment-declined") {
      add("payment-service", "PAYMENT_DECLINED", "Payment authorization was declined", {
        level: "WARN",
        outcome: "failure",
        payment: { amount, currency: "SAR", status: "declined" },
        error: { type: "CardDeclined", message: "Issuer declined the authorization" },
      });
    } else {
      add("payment-service", "PAYMENT_SUCCESS", "Payment authorization completed", {
        outcome: "success",
        payment: { amount, currency: "SAR", status: "authorized" },
      });
    }
  }

  if (scenario === "success") {
    add("order-service", "ORDER_CREATED", "Order persisted successfully", {
      outcome: "success",
      order: { id: orderId, status: "confirmed" },
    });
  } else if (scenario === "ghost-order") {
    add("order-service", "ORDER_CREATE_FAILED", "Order creation failed after successful payment", {
      level: "ERROR",
      outcome: "failure",
      error: { type: "DatabaseTimeout", message: "Timed out acquiring a database connection" },
    }, [80, 300]);
    add("postgresql", "DATABASE_TIMEOUT", "Database connection pool timed out", {
      level: "ERROR",
      outcome: "failure",
      database: { type: "sql", operation: "INSERT", name: "orders" },
      error: { type: "ConnectionPoolTimeout", message: "No connection available within 2000ms" },
    });
  }

  const result = SCENARIOS[scenario];
  add("checkout-service", "HTTP_REQUEST_COMPLETED", `Checkout ${result.status.replaceAll("_", " ")}`, {
    level: result.statusCode >= 500 ? "ERROR" : result.statusCode >= 400 ? "WARN" : "INFO",
    event: {
      id: nextEventId(),
      action: "HTTP_REQUEST_COMPLETED",
      category: ["web"],
      duration: elapsedMilliseconds * 1_000_000,
      outcome: result.statusCode < 400 ? "success" : "failure",
    },
    http: { request: { method: "POST" }, response: { status_code: result.statusCode } },
    url: { path: "/api/shop/checkout" },
  }, [1, 10]);

  return {
    events,
    response: {
      statusCode: result.statusCode,
      body: { status: result.status, scenario, order_id: orderId, trace_id: traceId },
    },
  };
}

module.exports = { PRODUCTS, SCENARIOS, chooseScenario, createCheckoutEvents };
