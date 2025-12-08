// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

import { createServer } from "node:http";

const PORT = 3000;

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();

    return;
  }

  if (req.method === "POST" && req.url?.startsWith("/events")) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const apiKeyFromQuery = url.searchParams.get("apiKey");
    const apiKeyFromHeader = req.headers["x-api-key"];
    const apiKey = apiKeyFromQuery || apiKeyFromHeader;

    console.log("🔑 API Key:", apiKey || "Not provided");

    let body = "";

    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body) as { events: unknown[] };

        console.log("📊 Received events:", JSON.stringify(data, null, 2));

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ success: true, received: data.events.length }),
        );
      } catch (error) {
        console.error(error);

        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });

    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`🚀 Event tracking server running at http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/events`);
});
