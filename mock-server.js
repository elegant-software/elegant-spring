// Minimal mock server to expose the graph API for ng-diagram demos.
// Run with: node mock-server.js
// Serves: GET /api/graph -> graph-mock.json

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const portEnv = process.env.PORT;
const parsedPort = Number.parseInt(portEnv ?? '', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
const graphPath = resolve('./graph-mock.json');

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const safeMessage = (err) => {
  if (process.env.NODE_ENV === 'production') return 'Internal error';
  if (err instanceof Error) return err.message;
  return String(err);
};

const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/api/graph')) {
    try {
      const data = await readFile(graphPath, 'utf8');
      json(res, 200, JSON.parse(data));
    } catch (err) {
      json(res, 500, {
        error: 'Failed to read mock graph',
        message: safeMessage(err),
        hint: 'Ensure graph-mock.json exists in the project root and is readable.',
      });
    }
    return;
  }

  json(res, 404, { error: 'Not found', message: 'Use /api/graph to retrieve the mock graph payload.' });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock graph API ready on http://localhost:${PORT}/api/graph`);
});
