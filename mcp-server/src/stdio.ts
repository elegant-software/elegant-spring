import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ensureDiagramStore } from './diagram-store.js';
import { createDiagramMcpServer } from './mcp-server.js';

async function main() {
  await ensureDiagramStore();
  const server = createDiagramMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
