// Project choice: Node built-ins keep the synthetic workload easy to explain.
// ECS-style trace fields connect events across simulated service names.
// Reference: https://www.elastic.co/guide/en/ecs/current/ecs-tracing.html
import crypto from "node:crypto";
import http from "node:http";
import net from "node:net";
import os from "node:os";

const PORT = Number(process.env.PORT || 3000);
const LOGSTASH_HOST = process.env.LOGSTASH_HOST || "logstash";
const LOGSTASH_PORT = Number(process.env.LOGSTASH_PORT || 5044);
const ENVIRONMENT = process.env.APP_ENV || "demo";
const MAX_BUFFERED_LOGS = Number(process.env.MAX_BUFFERED_LOGS || 5000);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const randomBetween = (minimum, maximum) =>
  Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
const newTraceId = () => crypto.randomBytes(16).toString("hex");
const newTransactionId = () => crypto.randomBytes(8).toString("hex");
const newOrderId = () => `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

// Mirror JSON to Docker logs and buffer events while Logstash restarts.
class LogstashSink {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.queue = [];
    this.socket = null;
    this.reconnectTimer = null;
    this.stopping = false;
    this.connect();
  }

  connect() {
    if (this.stopping || this.socket) return;

    const socket = net.createConnection({ host: this.host, port: this.port });
    this.socket = socket;
    socket.setKeepAlive(true, 10_000);

    socket.on("connect", () => {
      while (this.queue.length > 0 && !socket.destroyed) {
        socket.write(`${this.queue.shift()}\n`);
      }
    });

    socket.on("error", () => socket.destroy());
    socket.on("close", () => {
      if (this.socket === socket) this.socket = null;
      if (!this.stopping && !this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 2_000);
      }
    });
  }

  write(record) {
    const line = JSON.stringify(record);
    process.stdout.write(`${line}\n`);

    if (this.socket?.readyState === "open") {
      this.socket.write(`${line}\n`);
      return;
    }

    if (this.queue.length >= MAX_BUFFERED_LOGS) this.queue.shift();
    this.queue.push(line);
  }

  stop() {
    this.stopping = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.end();
  }
}

const sink = new LogstashSink(LOGSTASH_HOST, LOGSTASH_PORT);

function emit({ level = "INFO", service = "checkout-service", action, message, ...fields }) {
  sink.write({
    "@timestamp": new Date().toISOString(),
    message,
    log: { level },
    service: { name: service, version: "1.0.0" },
    event: { action, category: ["web", "transaction"] },
    host: { name: os.hostname() },
    labels: { environment: ENVIRONMENT, dataset: "ayn-al-sijill" },
    ...fields,
  });
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("request body is too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

// Services are simulated in one process: no real payments or database writes.
// Shared IDs let Kibana reconstruct a checkout across service labels.
async function checkout(request, response, forceGhostOrder = false) {
  const startedAt = process.hrtime.bigint();
  const body = await readJson(request);
  const traceId = request.headers["x-trace-id"] || newTraceId();
  const transactionId = newTransactionId();
  const orderId = newOrderId();
  const correlation = {
    trace: { id: traceId },
    transaction: { id: transactionId },
    order: { id: orderId },
    user: { id: body.customer_id || "anonymous" },
  };

  emit({
    action: "CHECKOUT_STARTED",
    message: "Checkout started",
    ...correlation,
    http: { request: { method: "POST" } },
  });

  await sleep(randomBetween(15, 60));
  emit({
    service: "inventory-service",
    action: "INVENTORY_RESERVED",
    message: "Inventory reserved for checkout",
    ...correlation,
    product: { count: Math.max(1, Number(body.items || 1)) },
  });

  await sleep(randomBetween(20, 90));
  emit({
    service: "payment-service",
    action: "PAYMENT_SUCCESS",
    message: "Payment authorization completed",
    ...correlation,
    payment: { amount: Number(body.amount || 149.95), currency: "SAR", status: "authorized" },
  });

  const ghostOrder = forceGhostOrder || body.scenario === "ghost-order";
  // This intentional failure creates the demonstration evidence.
  if (ghostOrder) {
    await sleep(randomBetween(80, 180));
    emit({
      level: "ERROR",
      service: "order-service",
      action: "ORDER_CREATE_FAILED",
      message: "Order creation failed after successful payment",
      ...correlation,
      error: { type: "DatabaseTimeout", message: "Timed out acquiring a database connection" },
    });
    emit({
      level: "ERROR",
      service: "postgresql",
      action: "DATABASE_TIMEOUT",
      message: "Database connection pool timed out",
      ...correlation,
      database: { type: "sql", operation: "INSERT", name: "orders" },
      error: { type: "ConnectionPoolTimeout", message: "No connection available within 2000ms" },
    });

    const duration = Number(process.hrtime.bigint() - startedAt);
    emit({
      level: "ERROR",
      action: "HTTP_REQUEST_COMPLETED",
      message: "Checkout request failed",
      ...correlation,
      event: { action: "HTTP_REQUEST_COMPLETED", category: ["web"], duration, outcome: "failure" },
      http: { request: { method: "POST" }, response: { status_code: 500 } },
      url: { path: request.url },
    });
    sendJson(response, 500, { status: "payment_captured_order_missing", order_id: orderId, trace_id: traceId });
    return;
  }

  await sleep(randomBetween(25, 100));
  emit({
    service: "order-service",
    action: "ORDER_CREATED",
    message: "Order persisted successfully",
    ...correlation,
    order: { id: orderId, status: "confirmed" },
  });

  const duration = Number(process.hrtime.bigint() - startedAt);
  emit({
    action: "HTTP_REQUEST_COMPLETED",
    message: "Checkout request completed",
    ...correlation,
    event: { action: "HTTP_REQUEST_COMPLETED", category: ["web"], duration, outcome: "success" },
    http: { request: { method: "POST" }, response: { status_code: 201 } },
    url: { path: request.url },
  });
  sendJson(response, 201, { status: "confirmed", order_id: orderId, trace_id: traceId });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }
    if (request.method === "GET" && request.url === "/") {
      sendJson(response, 200, {
        name: "Replica Shop",
        endpoints: ["POST /api/checkout", "POST /api/demo/ghost-order", "GET /health"],
      });
      return;
    }
    if (request.method === "POST" && request.url === "/api/checkout") {
      await checkout(request, response);
      return;
    }
    if (request.method === "POST" && request.url === "/api/demo/ghost-order") {
      await checkout(request, response, true);
      return;
    }
    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    emit({
      level: "ERROR",
      action: "UNHANDLED_REQUEST_ERROR",
      message: "Request could not be processed",
      error: { type: error.name, message: error.message },
      http: { request: { method: request.method }, response: { status_code: 400 } },
      url: { path: request.url },
    });
    if (!response.headersSent) sendJson(response, 400, { error: "invalid_request" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  emit({
    action: "APPLICATION_STARTED",
    message: `Replica Shop listening on port ${PORT}`,
    server: { port: PORT },
  });
});

function shutdown() {
  server.close(() => {
    sink.stop();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
