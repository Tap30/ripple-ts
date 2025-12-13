// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

import { createServer } from "node:http";

const PORT = 3000;

const server = createServer((req, res) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    // Add other trusted origins as needed:
    // "https://your-production-domain.com",
  ];
  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  // If there's no origin or it's untrusted, don't set Allow-Origin or Allow-Credentials.

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-API-Key, X-Ripple-API",
  );
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();

    return;
  }

  if (req.method === "POST" && req.url?.startsWith("/events")) {
    const apiKey = req.headers["x-api-key"];

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
