import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  ConnectionMode,
  MarkerType,
  ReactFlowInstance,
  MiniMap
} from 'reactflow';
import { toPng } from 'html-to-image';
import TableNode from './components/TableNode';
import Editor from './components/Editor';
import { DatabaseSchema, Relationship, Table, VisualConfig, Note as NoteType } from './types';
import { getLayoutedElements } from './utils/layoutUtils';
import { sanitizeId } from './utils/idUtils';
import { useHistory } from './hooks/useHistory';
import NoteNode from './components/NoteNode';
import { Link, StickyNote } from 'lucide-react';

const nodeTypes = {
  table: TableNode,
  note: NoteNode,
};

// Default Visual Configuration
const initialVisualConfig: VisualConfig = {
  relationshipColors: {
    '1:1': '#10b981', // Emerald
    '1:N': '#6366f1', // Indigo (Primary)
    'N:M': '#f43f5e', // Rose
    'default': '#64748b' // Slate
  }
};

// Helper to extract relationships from tables
const extractRelationships = (tables: Table[]): Relationship[] => {
  const relationships: Relationship[] = [];
  tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.isForeignKey && col.references) {
        const parts = col.references.split('.');
        if (parts.length === 2) {
          const targetTable = parts[0].trim();
          const targetCol = parts[1].trim();
          relationships.push({
            fromTable: table.name,
            fromColumn: col.name,
            toTable: targetTable,
            toColumn: targetCol,
            type: col.relationType || '1:N',
            label: col.relationLabel,
          });
        }
      }
    });
  });
  return relationships;
};

// Helper to generate edges with smart handle selection
const generateEdges = (relationships: Relationship[], visualConfig: VisualConfig, nodes: Node[] = []): Edge[] => {
  if (!nodes || nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return relationships.map((rel, index) => {
        const color = visualConfig.relationshipColors[rel.type as keyof typeof visualConfig.relationshipColors] || visualConfig.relationshipColors.default;
        
    const sourceNode = nodeMap.get(sanitizeId(rel.fromTable));
    const targetNode = nodeMap.get(sanitizeId(rel.toTable));

        // Default to standard Left-to-Right flow
        let sourceSide = 'right';
        let targetSide = 'left';

        // Smart Handle Logic
        if (sourceNode && targetNode) {
            const dx = targetNode.position.x - sourceNode.position.x;
            // Width estimation if not yet rendered
            const width = (sourceNode.width || 320); 

            // If nodes are far apart horizontally (distinct columns)
            if (Math.abs(dx) > width + 100) {
                 if (dx > 0) {
                     // Target is to the right: Source(Right) -> Target(Left)
                     sourceSide = 'right';
                     targetSide = 'left';
                 } else {
                     // Target is to the left: Source(Left) -> Target(Right)
                     sourceSide = 'left';
                     targetSide = 'right';
                 }
            } 
            // If nodes are stacked vertically (same column)
            else {
                 // Connect Right-to-Right to create a "bracket" loop
                 // This keeps the left side clean for incoming connections or hierarchy indicators
                 sourceSide = 'right';
                 targetSide = 'right';
            }
        }

        return {
          id: `e-${sanitizeId(rel.fromTable)}-${sanitizeId(rel.toTable)}-${index}`,
          source: sanitizeId(rel.fromTable),
          target: sanitizeId(rel.toTable),
          sourceHandle: `source-${sourceSide}-${sanitizeId(rel.fromColumn)}`,
          targetHandle: `target-${targetSide}-${sanitizeId(rel.toColumn)}`,
            label: rel.label ? `${rel.label} (${rel.type})` : rel.type,
            data: rel,
            animated: true, // Enable "running" dashed line animation
            style: { 
                stroke: color, 
                strokeWidth: 2,
            },
            type: 'smoothstep',
            // Large offset to route lines around tables
            pathOptions: { borderRadius: 40, offset: 80 }, 
            zIndex: 1, 
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: color,
                width: 24, 
                height: 24,
            },
            labelStyle: { fill: '#e2e8f0', fontWeight: 600, fontSize: 11 }, 
            labelBgStyle: { fill: '#0f172a', fillOpacity: 0.95, rx: 6, ry: 6, stroke: '#334155', strokeWidth: 1 },
        };
    });
};

// Initial Data
const initialTables: Table[] = [
    {
      name: 'Users',
      columns: [
        { name: 'id', type: 'UUID', isPrimaryKey: true, nullable: false },
        { name: 'username', type: 'VARCHAR(50)', nullable: false, isUnique: true },
        { name: 'email', type: 'VARCHAR(255)', nullable: false, isUnique: true },
        { name: 'role', type: 'VARCHAR(20)', nullable: false, checkConstraint: "role IN ('admin', 'user')" },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, comment: 'Record creation time' },
      ],
    },
    {
      name: 'Posts',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false },
        { name: 'user_id', type: 'UUID', isForeignKey: true, references: 'Users.id', relationType: '1:N', relationLabel: 'author' },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'content', type: 'TEXT', nullable: true },
      ]
    }
];

export default function App() {
  const [visualConfig, setVisualConfig] = useState<VisualConfig>(initialVisualConfig);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // History State
  const { 
    state: schema, 
    set: setSchema, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistory<DatabaseSchema>({
      tables: initialTables,
      relationships: extractRelationships(initialTables),
      notes: []
  });

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [tooltip, setTooltip] = useState<{x: number, y: number, content: React.ReactNode} | null>(null);

  const handleNodeTooltip = useCallback((data: any) => {
    setTooltip(data);
  }, []);

  // Debounce scheduler for edge/layout recomputation to avoid repeated expensive updates
  const refreshTimerRef = React.useRef<number | null>(null);
  const lastEdgesKeyRef = React.useRef<string>('');

  const getNodesPositionsKey = (nodesArr: Node[]) => {
    return nodesArr.map(n => `${n.id}@${Math.round((n.position as any).x || 0)},${Math.round((n.position as any).y || 0)}`).join('|');
  };

  const scheduleRefreshEdges = (currentNodes: Node[], delay = 120) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Use window.setTimeout to get a numeric id compatible with DOM
    refreshTimerRef.current = window.setTimeout(() => {
      try {
        const newEdges = generateEdges(schema.relationships, visualConfig, currentNodes);

        // Create a lightweight key to determine if edges changed meaningfully
        const edgesKey = newEdges.map(e => `${e.id}:${e.source}->${e.target}:${e.sourceHandle}:${e.targetHandle}`).join('|');
        const nodesKey = getNodesPositionsKey(currentNodes);

        const composedKey = `${nodesKey}||${edgesKey}`;
        if (composedKey !== lastEdgesKeyRef.current) {
          lastEdgesKeyRef.current = composedKey;
          setEdges(newEdges);
        }
      } finally {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      }
    }, delay) as unknown as number;
  };

  // Initial Layout & Schema Sync
  useEffect(() => {
    // Merge layouted tables with notes
    const { nodes: layoutedNodes } = getLayoutedElements(schema, visualConfig);
    const noteNodes: Node[] = (schema.notes || []).map(note => ({
      id: note.id,
      type: 'note',
      position: { x: note.x, y: note.y },
      data: { 
        ...note, 
        onChange: (content: string) => updateNote(note.id, { content }),
        onColorChange: (color: string) => updateNote(note.id, { color }),
        onDelete: () => deleteNote(note.id)
      },
    }));

    const allNodes = [...layoutedNodes, ...noteNodes];
    // Apply initial smart routing based on layout positions
    const smartEdges = generateEdges(schema.relationships, visualConfig, allNodes);
    
    setNodes(allNodes.map(n => {
        if (n.type === 'table') {
            return { ...n, data: { ...n.data, setTooltip: handleNodeTooltip } };
        }
        return n;
    }));
    setEdges(smartEdges);
  }, [schema]); // Re-run when schema (history) changes

  // Note Handlers
  const addNote = useCallback(() => {
      const id = `note-${Date.now()}`;
      const newNote: NoteType = {
          id,
          content: '',
          x: -100 + Math.random() * 50,
          y: 100 + Math.random() * 50,
          color: '#fef3c7'
      };
      setSchema({
          ...schema,
          notes: [...(schema.notes || []), newNote]
      });
  }, [schema, setSchema]);

  const updateNote = useCallback((id: string, updates: Partial<NoteType>) => {
      setSchema({
          ...schema,
          notes: (schema.notes || []).map(n => n.id === id ? { ...n, ...updates } : n)
      });
  }, [schema, setSchema]);

  const deleteNote = useCallback((id: string) => {
      setSchema({
          ...schema,
          notes: (schema.notes || []).filter(n => n.id !== id)
      });
  }, [schema, setSchema]);

  // Theme Handler
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    // Implement actual CSS/Class toggle if needed, or pass downward
    // Assuming root class or CSS variables
  }, []);

  // Update edges when visual config changes, using current nodes state
  useEffect(() => {
     setEdges((eds) => {
        // We pass 'nodes' here. Note: if nodes are empty (first render), it defaults.
        // Use scheduled refresh to prevent repeated heavy recomputes
        scheduleRefreshEdges(nodes);
        return eds;
     });
  }, [visualConfig, schema.relationships]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Update logic to handle dragging notes persistence
    const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
      // If it's a note, save position to history
      if (node.type === 'note') {
          setSchema({
              ...schema,
              notes: (schema.notes || []).map(n => 
                  n.id === node.id 
                      ? { ...n, x: node.position.x, y: node.position.y }
                      : n
              )
          });
      }

      // Recalculate edge paths based on the current nodes state or reactflow instance
        const currentNodes = rfInstance?.getNodes ? (rfInstance.getNodes() as Node[]) : nodes;
        // schedule a debounced refresh to avoid excessive recompute while dragging
        scheduleRefreshEdges(currentNodes);
      setTooltip(null);
    }, [rfInstance, nodes, schema, visualConfig, setSchema]); // Added schema/setSchema dependency

    // No longer strictly need initial useEffect since [schema] dependency handles it, 
    // but might keep a mount effect if we want force layout on load ONLY?
    // Actually the above effect on [schema] covers everything: simple and robust for Undo/Redo.
    // BUT we need to distinguish between "User dragged table" (visual only) vs "History changed table" (re-layout).
    // Current approach: Schema change -> Re-layout Tables.
    // This defines: Moving a Table is NOT stored in history (it resets on Undo/Redo or Schema change).
    // Moving a Note IS stored in history.
    // This is acceptable behavior for "Auto-Layout" driven diagram.


  const onEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
      if (!edge.data) return;
      const rel = edge.data as Relationship;
      setTooltip({
          x: event.clientX + 15,
          y: event.clientY + 15,
          content: (
                <div className="space-y-1">
                    <div className="text-xs font-bold text-accent flex items-center gap-2">
                        <Link size={12} /> Relationship
                    </div>
                    <div className="text-xs text-slate-300 font-mono">
                        {rel.fromTable}.{rel.fromColumn} <span className="text-slate-500">→</span> {rel.toTable}.{rel.toColumn}
                    </div>
                     <div className="text-xs text-slate-400 pt-1 border-t border-slate-700 mt-1 flex justify-between gap-4">
                        <span>{rel.type}</span>
                        <span className="italic text-slate-500">{rel.label}</span>
                    </div>
                </div>
          )
      });
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleSchemaUpdate = (newTables: Table[], shouldLayout = false) => {
    const newRelationships = extractRelationships(newTables);
    // Preserve existing notes
    const newSchema = { 
        tables: newTables, 
        relationships: newRelationships,
        notes: schema.notes || []
    };
    setSchema(newSchema);
    // Layout and everything else handled by the useEffect([schema])
  };

  const handleForceLayout = () => {
    const { nodes: newNodes } = getLayoutedElements(schema, visualConfig);
    const smartEdges = generateEdges(schema.relationships, visualConfig, newNodes);
    
    setNodes(newNodes.map(n => ({ ...n, data: { ...n.data, setTooltip: handleNodeTooltip } })));
    setEdges(smartEdges);
    setTimeout(() => {
        rfInstance?.fitView({ duration: 800, padding: 0.2 });
    }, 50);
  };

  const handleExportImage = useCallback(() => {
    const node = document.querySelector('.react-flow') as HTMLElement;
    if (!node) return;

    const filter = (child: HTMLElement) => {
        return !child.classList?.contains('react-flow__controls');
    };

    toPng(node, {
        backgroundColor: '#020617', 
        filter,
    })
    .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'db-schema-diagram.png';
        link.href = dataUrl;
        link.click();
    })
    .catch((err) => {
        console.error('Failed to export image', err);
    });
  }, []);


  return (
    <div className="flex h-screen w-screen bg-background text-slate-200 overflow-hidden font-sans relative">
      <div className="w-[480px] flex-shrink-0 h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.3)] border-r border-border bg-surface flex flex-col">
        <Editor 
            schema={schema}
            onSchemaChange={handleSchemaUpdate}
            onForceLayout={handleForceLayout}
            visualConfig={visualConfig}
            onVisualConfigChange={setVisualConfig}
            onExportImage={handleExportImage}
            // New Features
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onAddNote={addNote}
            theme={theme}
            onThemeChange={toggleTheme}
        />
      </div>

      <div className="flex-1 h-full relative bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          minZoom={0.1}
          maxZoom={2}
          onInit={setRfInstance}
          onPaneClick={() => setTooltip(null)}
          onNodeDragStart={() => setTooltip(null)}
          onMoveStart={() => setTooltip(null)}
        >
          <Background color={theme === 'dark' ? "#1e293b" : "#e2e8f0"} gap={20} size={1} />
          <Controls className="!bg-surfaceLight !border-border !fill-slate-300" />
          <MiniMap 
            nodeStrokeColor="#334155" 
            nodeColor="#0f172a" 
            maskColor="rgba(0, 0, 0, 0.2)"
            className="!bg-surfaceLight/80 !border-border rounded-lg overflow-hidden" 
          />
        </ReactFlow>

        {/* Floating Tooltip */}
        {tooltip && (
            <div 
                className="fixed z-50 bg-slate-900/95 backdrop-blur border border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-lg p-3 min-w-[200px] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                style={{ 
                    left: Math.min(tooltip.x, window.innerWidth - 220), 
                    top: Math.min(tooltip.y, window.innerHeight - 150) 
                }}
            >
                {tooltip.content}
            </div>
        )}
      </div>
    </div>
  );
}