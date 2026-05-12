import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { createGHLClient } from "./services/ghlClient.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerOpportunityTools } from "./tools/opportunities.js";
import { registerCalendarTools } from "./tools/calendars.js";
import { registerMessageTools } from "./tools/messages.js";

const API_KEY = process.env.GHL_API_KEY || "";
const LOCATION_ID = process.env.GHL_LOCATION_ID || "";

if (!API_KEY || !LOCATION_ID) {
  console.error("Error: GHL_API_KEY y GHL_LOCATION_ID son requeridos como variables de entorno.");
  process.exit(1);
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "ghl-mcp-server",
    version: "1.0.0",
  });

  const client = createGHLClient(API_KEY);

  registerContactTools(server, client, LOCATION_ID);
  registerOpportunityTools(server, client, LOCATION_ID);
  registerCalendarTools(server, client, LOCATION_ID);
  registerMessageTools(server, client, LOCATION_ID);

  return server;
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "ghl-mcp-server" });
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    console.error(`GHL MCP Server corriendo en http://localhost:${port}/mcp`);
  });
}

async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GHL MCP Server iniciado en modo stdio");
}

const transport = process.env.TRANSPORT || "http";
if (transport === "http") {
  runHTTP().catch((error) => {
    console.error("Error del servidor:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    console.error("Error del servidor:", error);
    process.exit(1);
  });
}
