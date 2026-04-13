import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { diagramPayloadSchema, type DiagramPayload } from './contracts.js';
import {
  ensureDiagramStore,
  loadDiagramPayload,
  saveDiagramPayload,
  toNgDiagramGraph,
  watchDiagramPayload,
} from './diagram-store.js';
import { createDiagramMcpServer } from './mcp-server.js';

const PORT = Number.parseInt(process.env.PORT ?? '3100', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Active MCP sessions keyed by session ID ──────────────────────────────────
const mcpTransports: Record<string, StreamableHTTPServerTransport> = {};

// ── Diagram REST helpers ─────────────────────────────────────────────────────

const broadcastDiagram = (wsServer: WebSocketServer, eventName: string, payload: DiagramPayload) => {
  const event = JSON.stringify({
    event: eventName,
    generatedAt: new Date().toISOString(),
    payload: toNgDiagramGraph(payload),
  });

  for (const client of wsServer.clients) {
    if (client.readyState === 1) {
      client.send(event);
    }
  }
};

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Diagram REST API ─────────────────────────────────────────────────────────

app.get('/api/diagram', async (_req, res) => {
  const currentGraph = await loadDiagramPayload();
  res.json({
    version: currentGraph.version,
    generatedAt: new Date().toISOString(),
    ...toNgDiagramGraph(currentGraph),
  });
});

app.post('/api/diagram', async (req, res) => {
  const parsed = diagramPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid diagram payload',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const currentGraph = await saveDiagramPayload(parsed.data);
  const mapped = toNgDiagramGraph(currentGraph);
  broadcastDiagram(wsServer, 'diagram.updated', currentGraph);

  return res.status(202).json({ message: 'Diagram accepted', ...mapped });
});

// ── MCP Streamable HTTP transport (/mcp) ─────────────────────────────────────

app.all('/mcp', async (req, res) => {
  // Handle DELETE – terminate session
  if (req.method === 'DELETE') {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && mcpTransports[sessionId]) {
      await mcpTransports[sessionId].close();
      delete mcpTransports[sessionId];
      res.status(200).json({ message: 'Session terminated' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
    return;
  }

  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && mcpTransports[sessionId]) {
      // Reuse existing session
      transport = mcpTransports[sessionId];
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      // New session – create transport and wire up a fresh MCP server
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          mcpTransports[sid] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && mcpTransports[sid]) {
          delete mcpTransports[sid];
        }
      };

      const mcpServer = createDiagramMcpServer();
      await mcpServer.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// ── HTTP + WebSocket server ──────────────────────────────────────────────────

const server = createServer(app);
const wsServer = new WebSocketServer({ server, path: '/ws/diagram' });

wsServer.on('connection', async (socket) => {
  const currentGraph = await loadDiagramPayload();
  socket.send(
    JSON.stringify({
      event: 'diagram.snapshot',
      payload: toNgDiagramGraph(currentGraph),
      generatedAt: new Date().toISOString(),
    }),
  );
});

await ensureDiagramStore();

const stopWatching = watchDiagramPayload((payload) => {
  broadcastDiagram(wsServer, 'diagram.updated', payload);
});

server.listen(PORT, HOST, () => {
  console.log(`Spring Arch View server listening on http://${HOST}:${PORT}`);
  console.log(`  REST API:   /api/diagram (GET, POST)`);
  console.log(`  WebSocket:  /ws/diagram`);
  console.log(`  MCP HTTP:   /mcp (POST, GET, DELETE)`);
  console.log(`  Health:     /health`);
});

server.on('close', () => {
  stopWatching();
});

process.on('SIGINT', async () => {
  console.log('Shutting down…');
  for (const sid in mcpTransports) {
    await mcpTransports[sid].close().catch(() => {});
    delete mcpTransports[sid];
  }
  server.close();
  process.exit(0);
});
