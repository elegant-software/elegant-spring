import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { diagramPayloadSchema, type DiagramPayload } from './contracts.js';
import {
  ensureDiagramStore,
  loadDiagramPayload,
  saveDiagramPayload,
  toNgDiagramGraph,
  watchDiagramPayload,
} from './diagram-store.js';

const PORT = Number.parseInt(process.env.PORT ?? '3100', 10);
const HOST = process.env.HOST ?? '127.0.0.1';
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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
  console.log(`Spring Dashboard server listening on http://${HOST}:${PORT}`);
});

server.on('close', () => {
  stopWatching();
});
