function basicAuthorization(token) {
  return `Basic ${Buffer.from(`azure-function:${token}`).toString("base64")}`;
}

async function publishEvents(events, context = console) {
  const url = process.env.LOG_INGEST_URL;
  const token = process.env.LOG_INGEST_TOKEN;

  if (!url) {
    for (const event of events) context.log(JSON.stringify(event));
    return;
  }
  if (!token) throw new Error("LOG_INGEST_TOKEN is required when LOG_INGEST_URL is set.");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: basicAuthorization(token),
      "content-type": "application/json",
    },
    body: JSON.stringify(events),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Logstash rejected the event batch with HTTP ${response.status}.`);
}

module.exports = { basicAuthorization, publishEvents };
