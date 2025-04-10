#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerShellTools } from "./tools/shell-tools.js";

async function main() {
  try {
    // Create the MCP server
    const server = new McpServer({
      name: "PermShell",
      version: "1.0.0"
    });

    // Register tools
    registerShellTools(server);

    // Start the server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("PermShell MCP Server running");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

// Start the server
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
