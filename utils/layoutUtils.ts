import { Node, Edge, MarkerType } from 'reactflow';
import { DatabaseSchema, VisualConfig, Table } from '../types';
import { sanitizeId } from './idUtils';

// Estimates the height of a table node based on its columns
const estimateHeight = (table: Table) => {
    const HEADER_HEIGHT = 50;
    const ROW_HEIGHT = 40; // Approximate height per column including padding/border
    const PADDING = 20;
    return HEADER_HEIGHT + (table.columns.length * ROW_HEIGHT) + PADDING;
};

export const getLayoutedElements = (schema: DatabaseSchema, config: VisualConfig) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  const NODE_WIDTH = 320; 
  // Increased spacing to allow room for edges to route "around" tables (offset 80px * 2 = 160px needed approx)
  const HORIZONTAL_SPACING = 250; 
  const VERTICAL_SPACING = 150;

  const tableNames = schema.tables.map(t => t.name);
  
  // 1. Calculate Levels (Ranks) for Layered Layout
  const levels: Record<string, number> = {};
  tableNames.forEach(t => levels[t] = 0);

  // Map: tableName -> array of tables it references (parents)
  const dependencies: Record<string, string[]> = {};
  schema.tables.forEach(t => dependencies[t.name] = []);

  schema.relationships.forEach(rel => {
      // rel.fromTable has the FK, so it depends on rel.toTable
      if (dependencies[rel.fromTable] && tableNames.includes(rel.toTable)) {
          // Avoid self-references adding to dependency count for layout
          if (rel.fromTable !== rel.toTable) {
            dependencies[rel.fromTable].push(rel.toTable);
          }
      }
  });

  // Iteratively push tables down
  const maxIterations = tableNames.length + 1;
  for (let i = 0; i < maxIterations; i++) {
      let changed = false;
      tableNames.forEach(tableName => {
          const parents = dependencies[tableName];
          if (parents.length > 0) {
              const maxParentLevel = Math.max(...parents.map(p => levels[p] || 0));
              if (levels[tableName] <= maxParentLevel) {
                  levels[tableName] = maxParentLevel + 1;
                  changed = true;
              }
          }
      });
      if (!changed) break;
  }

  // 2. Group tables into rows by their level
  const rows: Table[][] = [];
  tableNames.forEach(t => {
      const level = levels[t];
      if (!rows[level]) rows[level] = [];
      const tableData = schema.tables.find(tbl => tbl.name === t);
      if (tableData) rows[level].push(tableData);
  });

  // 3. Assign Coordinates
  let currentY = 50;

  rows.forEach((rowTables, rowIndex) => {
      if (!rowTables || rowTables.length === 0) return;

      // Calculate width of this row
      const rowWidth = rowTables.length * NODE_WIDTH + (rowTables.length - 1) * HORIZONTAL_SPACING;
      
      // Center based on 0 axis
      let startX = -(rowWidth / 2);

      // Determine height of this row (tallest table)
      let maxRowHeight = 0;

      rowTables.forEach((table, colIndex) => {
          const h = estimateHeight(table);
          if (h > maxRowHeight) maxRowHeight = h;

          nodes.push({
                  id: sanitizeId(table.name),
                  type: 'table',
                  position: { 
                      x: startX + colIndex * (NODE_WIDTH + HORIZONTAL_SPACING), 
                      y: currentY 
                  },
                  data: table,
              });
      });

      // Move Y down for the next row
      currentY += maxRowHeight + VERTICAL_SPACING;
  });

  return { nodes, edges }; // Edges are generated in App.tsx now
};