import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { watchFile, unwatchFile } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagramPayloadSchema, type DiagramPayload } from './contracts.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(moduleDir, '../data');
export const diagramStorePath = path.join(dataDir, 'current-diagram.json');

export const sampleDiagramPayload: DiagramPayload = {
  version: '1.0',
  entities: [
    {
      id: 'employee',
      label: 'Employee',
      type: 'entity',
      status: 'healthy',
      layoutHint: { x: 180, y: 140 },
      metadata: {
        kind: 'jpa-entity',
        packageName: 'com.example.hr.domain',
        tableName: 'employees',
        idField: 'id',
        description: 'Core workforce record that belongs to one department and owns one salary aggregate.',
        annotations: ['@Entity', '@Table(name = "employees")'],
        businessRules: ['Every employee must belong to a department.', 'Salary is managed as a dedicated aggregate.'],
        fields: [
          { name: 'id', type: 'Long', column: 'id', id: true, nullable: false },
          { name: 'employeeNumber', type: 'String', column: 'employee_number', nullable: false, unique: true },
          { name: 'fullName', type: 'String', column: 'full_name', nullable: false },
          { name: 'department', type: 'Department', column: 'department_id', nullable: false },
          { name: 'salary', type: 'Salary', nullable: false },
        ],
      },
    },
    {
      id: 'department',
      label: 'Department',
      type: 'entity',
      status: 'healthy',
      layoutHint: { x: 460, y: 140 },
      metadata: {
        kind: 'jpa-entity',
        packageName: 'com.example.hr.domain',
        tableName: 'departments',
        idField: 'id',
        description: 'Organizational unit that groups employees and exposes a manager reference.',
        annotations: ['@Entity', '@Table(name = "departments")'],
        businessRules: ['A department can contain many employees.', 'Department names must be unique.'],
        fields: [
          { name: 'id', type: 'Long', column: 'id', id: true, nullable: false },
          { name: 'name', type: 'String', column: 'name', nullable: false, unique: true },
          { name: 'costCenter', type: 'String', column: 'cost_center', nullable: false },
          { name: 'employees', type: 'List<Employee>', nullable: true },
        ],
      },
    },
    {
      id: 'salary',
      label: 'Salary',
      type: 'entity',
      status: 'healthy',
      layoutHint: { x: 740, y: 140 },
      metadata: {
        kind: 'jpa-entity',
        packageName: 'com.example.hr.domain',
        tableName: 'salaries',
        idField: 'id',
        description: 'Compensation aggregate linked one-to-one with an employee.',
        annotations: ['@Entity', '@Table(name = "salaries")'],
        businessRules: ['Each employee has at most one active salary record.'],
        fields: [
          { name: 'id', type: 'Long', column: 'id', id: true, nullable: false },
          { name: 'baseAmount', type: 'BigDecimal', column: 'base_amount', nullable: false },
          { name: 'currency', type: 'String', column: 'currency', nullable: false },
          { name: 'effectiveFrom', type: 'LocalDate', column: 'effective_from', nullable: false },
          { name: 'employee', type: 'Employee', column: 'employee_id', nullable: false, unique: true },
        ],
      },
    },
  ],
  relationships: [
    {
      id: 'employee-department',
      source: 'employee',
      target: 'department',
      label: '@ManyToOne',
      channel: 'JPA',
      metadata: {
        relationType: 'ManyToOne',
        sourceField: 'department',
        targetField: 'employees',
        cardinality: 'N:1',
        owningSide: true,
        fetch: 'LAZY',
      },
    },
    {
      id: 'employee-salary',
      source: 'employee',
      target: 'salary',
      label: '@OneToOne',
      channel: 'JPA',
      metadata: {
        relationType: 'OneToOne',
        sourceField: 'salary',
        targetField: 'employee',
        cardinality: '1:1',
        owningSide: true,
        fetch: 'LAZY',
      },
    },
  ],
};

export const toNgDiagramGraph = (payload: DiagramPayload) => ({
  nodes: payload.entities.map((entity, index) => ({
    id: entity.id,
    name: entity.label,
    type: entity.type,
    status: entity.status,
    metadata: entity.metadata ?? {},
    ...(entity.layoutHint
      ? { position: entity.layoutHint }
      : {
          position: {
            x: 180 + (index % 4) * 180,
            y: 120 + Math.floor(index / 4) * 180,
          },
        }),
  })),
  links: payload.relationships,
});

const serializeDiagram = (payload: DiagramPayload) => `${JSON.stringify(payload, null, 2)}\n`;
const parseDiagram = (raw: string): DiagramPayload => diagramPayloadSchema.parse(JSON.parse(raw));

export async function ensureDiagramStore(): Promise<DiagramPayload> {
  await mkdir(dataDir, { recursive: true });

  try {
    const raw = await readFile(diagramStorePath, 'utf8');
    return parseDiagram(raw);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }

    await writeFile(diagramStorePath, serializeDiagram(sampleDiagramPayload), 'utf8');
    return sampleDiagramPayload;
  }
}

export async function loadDiagramPayload(): Promise<DiagramPayload> {
  await ensureDiagramStore();
  const raw = await readFile(diagramStorePath, 'utf8');
  return parseDiagram(raw);
}

export async function saveDiagramPayload(payload: DiagramPayload): Promise<DiagramPayload> {
  const normalized = diagramPayloadSchema.parse(payload);
  await ensureDiagramStore();
  await writeFile(diagramStorePath, serializeDiagram(normalized), 'utf8');
  return normalized;
}

export async function resetDiagramPayload(): Promise<DiagramPayload> {
  return saveDiagramPayload(sampleDiagramPayload);
}

export function watchDiagramPayload(onChange: (payload: DiagramPayload) => void | Promise<void>): () => void {
  let lastSerialized = '';

  const emitIfChanged = async () => {
    try {
      const payload = await loadDiagramPayload();
      const serialized = serializeDiagram(payload);

      if (serialized === lastSerialized) {
        return;
      }

      lastSerialized = serialized;
      await onChange(payload);
    } catch {
      // Keep watching even if the file is temporarily invalid.
    }
  };

  void emitIfChanged();
  watchFile(diagramStorePath, { interval: 500 }, () => {
    void emitIfChanged();
  });

  return () => unwatchFile(diagramStorePath);
}
