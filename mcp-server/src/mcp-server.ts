import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { diagramPayloadSchema } from './contracts.js';
import {
  loadDiagramPayload,
  resetDiagramPayload,
  sampleDiagramPayload,
  saveDiagramPayload,
} from './diagram-store.js';

const safeJson = (value: unknown) => JSON.stringify(value, null, 2);

export function createDiagramMcpServer(): McpServer {
  const server = new McpServer({
    name: 'spring-dashboard-diagram-server',
    version: '0.2.0',
  });

  server.registerTool(
    'get_current_diagram',
    {
      title: 'Get Current Diagram',
      description: 'Return the current JPA domain diagram payload used by the Spring Dashboard.',
    },
    async () => {
      const payload = await loadDiagramPayload();
      return {
        content: [{ type: 'text', text: safeJson(payload) }],
        structuredContent: payload,
      };
    },
  );

  server.registerTool(
    'get_entity_details',
    {
      title: 'Get Entity Details',
      description: 'Return one entity and all relationships connected to it.',
      inputSchema: {
        entityId: z.string().min(1),
      },
    },
    async ({ entityId }) => {
      const payload = await loadDiagramPayload();
      const entity = payload.entities.find((candidate) => candidate.id === entityId);

      if (!entity) {
        return {
          content: [{ type: 'text', text: `Entity '${entityId}' was not found.` }],
          isError: true,
        };
      }

      const relationships = payload.relationships.filter(
        (relationship) => relationship.source === entityId || relationship.target === entityId,
      );

      const result = { entity, relationships };
      return {
        content: [{ type: 'text', text: safeJson(result) }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    'set_current_diagram',
    {
      title: 'Set Current Diagram',
      description:
        'Replace the current dashboard diagram with a full JSON payload that matches the Spring Dashboard schema.',
      inputSchema: {
        payloadJson: z.string().min(2),
      },
    },
    async ({ payloadJson }) => {
      try {
        const parsed = diagramPayloadSchema.parse(JSON.parse(payloadJson));
        const saved = await saveDiagramPayload(parsed);

        return {
          content: [
            {
              type: 'text',
              text: `Diagram accepted with ${saved.entities.length} entities and ${saved.relationships.length} relationships.`,
            },
          ],
          structuredContent: saved,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: `Invalid diagram payload: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'reset_sample_diagram',
    {
      title: 'Reset Sample Diagram',
      description: 'Restore the sample Employee/Department/Salary diagram.',
    },
    async () => {
      const payload = await resetDiagramPayload();
      return {
        content: [{ type: 'text', text: 'Sample diagram restored.' }],
        structuredContent: payload,
      };
    },
  );

  server.registerResource(
    'current-diagram',
    'diagram://current',
    {
      title: 'Current Diagram',
      description: 'The active JPA diagram payload backing the dashboard.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const payload = await loadDiagramPayload();
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: safeJson(payload) }],
      };
    },
  );

  server.registerResource(
    'entity-diagram',
    new ResourceTemplate('diagram://entities/{entityId}', { list: undefined }),
    {
      title: 'Entity Diagram Details',
      description: 'An entity plus the relationships connected to it.',
      mimeType: 'application/json',
    },
    async (uri, { entityId }) => {
      const payload = await loadDiagramPayload();
      const entity = payload.entities.find((candidate) => candidate.id === entityId);

      if (!entity) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: safeJson({ message: `Entity '${entityId}' was not found.` }),
            },
          ],
        };
      }

      const relationships = payload.relationships.filter(
        (relationship) => relationship.source === entityId || relationship.target === entityId,
      );

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: safeJson({ entity, relationships }),
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'generate-jpa-diagram-json',
    {
      title: 'Generate JPA Diagram JSON',
      description: 'Guide a model to produce valid JSON for the Spring Dashboard diagram server.',
      argsSchema: {
        projectName: z.string().optional(),
      },
    },
    ({ projectName }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Generate a valid Spring Dashboard diagram payload${projectName ? ` for ${projectName}` : ''}.`,
              'Use JSON only.',
              'The root object must include version, entities, and relationships.',
              'Each entity metadata.kind must be "jpa-entity".',
              'Relationships must reference existing entity ids.',
              `Use this sample shape as a reference:\n${safeJson(sampleDiagramPayload)}`,
            ].join('\n'),
          },
        },
      ],
    }),
  );

  return server;
}
