import { performance } from 'perf_hooks';
// Inline a simplified copy of getLayoutedElements to avoid importing project types at runtime

const sanitizeId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_');

const estimateHeight = (table: any) => {
  const HEADER_HEIGHT = 50;
  const ROW_HEIGHT = 40;
  const PADDING = 20;
  return HEADER_HEIGHT + (table.columns.length * ROW_HEIGHT) + PADDING;
};

const getLayoutedElements = (schema: any, _config: any) => {
  const nodes: any[] = [];
  const edges: any[] = [];
  const NODE_WIDTH = 320;
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 150;

  const tableNames = schema.tables.map((t: any) => t.name);
  const levels: Record<string, number> = {};
  tableNames.forEach((t: string) => (levels[t] = 0));

  const dependencies: Record<string, string[]> = {};
  schema.tables.forEach((t: any) => (dependencies[t.name] = []));

  schema.relationships.forEach((rel: any) => {
    if (dependencies[rel.fromTable] && tableNames.includes(rel.toTable)) {
      if (rel.fromTable !== rel.toTable) dependencies[rel.fromTable].push(rel.toTable);
    }
  });

  const maxIterations = tableNames.length + 1;
  for (let i = 0; i < maxIterations; i++) {
    let changed = false;
    tableNames.forEach((tableName) => {
      const parents = dependencies[tableName];
      if (parents.length > 0) {
        const maxParentLevel = Math.max(...parents.map((p) => levels[p] || 0));
        if (levels[tableName] <= maxParentLevel) {
          levels[tableName] = maxParentLevel + 1;
          changed = true;
        }
      }
    });
    if (!changed) break;
  }

  const rows: any[] = [];
  tableNames.forEach((t: string) => {
    const level = levels[t];
    if (!rows[level]) rows[level] = [];
    const tableData = schema.tables.find((tbl: any) => tbl.name === t);
    if (tableData) rows[level].push(tableData);
  });

  let currentY = 50;
  rows.forEach((rowTables: any[]) => {
    if (!rowTables || rowTables.length === 0) return;
    const rowWidth = rowTables.length * NODE_WIDTH + (rowTables.length - 1) * HORIZONTAL_SPACING;
    let startX = -(rowWidth / 2);
    let maxRowHeight = 0;
    rowTables.forEach((table: any, colIndex: number) => {
      const h = estimateHeight(table);
      if (h > maxRowHeight) maxRowHeight = h;
      nodes.push({
        id: sanitizeId(table.name),
        type: 'table',
        position: { x: startX + colIndex * (NODE_WIDTH + HORIZONTAL_SPACING), y: currentY },
        data: table,
      });
    });
    currentY += maxRowHeight + VERTICAL_SPACING;
  });

  return { nodes, edges };
};

type VisualConfig = any;

// Simple generator for tables and columns
function generateSchema(tableCount: number, colsPerTable = 5) {
  const tables: any[] = [];
  for (let i = 0; i < tableCount; i++) {
    const name = `T_${i}`;
    const columns = [];
    for (let c = 0; c < colsPerTable; c++) {
      columns.push({ name: `c${c}`, type: 'INT' });
    }
    tables.push({ name, columns });
  }

  // Create some random foreign keys to produce relationships
  const relationships: any[] = [];
  for (let i = 0; i < Math.floor(tableCount * 0.6); i++) {
    const from = Math.floor(Math.random() * tableCount);
    let to = Math.floor(Math.random() * tableCount);
    if (to === from) to = (to + 1) % tableCount;
    relationships.push({ fromTable: `T_${from}`, fromColumn: 'c0', toTable: `T_${to}`, toColumn: 'c0', type: '1:N' });
  }

  return { tables, relationships };
}

const visualConfig: VisualConfig = {
  relationshipColors: {
    '1:1': '#10b981',
    '1:N': '#6366f1',
    'N:M': '#f43f5e',
    'default': '#64748b'
  }
};

async function run() {
  const sizes = [10, 50, 100, 200, 400];
  console.log('Layout benchmark — measuring getLayoutedElements (no ReactFlow)');
  console.log('Note: run with `npx ts-node tools/perf/layout-benchmark.ts`');
  console.log('---------------------------------------------------------');

  for (const n of sizes) {
    const schema = generateSchema(n, 8);
    const t0 = performance.now();
    const result = getLayoutedElements(schema as any, visualConfig as any);
    const t1 = performance.now();

    const nodeCount = result.nodes.length;
    const elapsed = (t1 - t0).toFixed(2);
    console.log(`Tables: ${n}, Nodes produced: ${nodeCount}, Time: ${elapsed} ms`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
