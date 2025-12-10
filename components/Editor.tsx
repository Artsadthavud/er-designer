import { parseMagicText } from '../utils/magicParser';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, Layout, Code, 
  Key, Link, Search, Fingerprint, Ban, ShieldAlert, MessageSquareText, 
  X, RefreshCw, Database, ChevronsUpDown, GripVertical, Settings, 
  Image as ImageIcon, FolderOpen, Save, HelpCircle, BookOpen, Eraser, Play, AlertTriangle,
  Undo, Redo, StickyNote, Sun, Moon, FileJson, FileCode, Copy, Sparkles, Wand2
} from 'lucide-react';
import { DatabaseSchema, Table, Column, VisualConfig } from '../types';
import { generatePrismaSchema, generateTypeORMEntries } from '../utils/exportUtils';

interface EditorProps {
  schema: DatabaseSchema;
  onSchemaChange: (tables: Table[], shouldLayout?: boolean) => void;
  onForceLayout: () => void;
  visualConfig?: VisualConfig;
  onVisualConfigChange?: (config: VisualConfig) => void;
  onExportImage?: () => void;
  // Undo/Redo
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  // Notes
  onAddNote?: () => void;
  // Theme
  theme?: 'light' | 'dark';
  onThemeChange?: () => void;
}

// Types Configuration
const TYPE_CATEGORIES = {
  "Numeric": ["INT", "BIGINT", "DECIMAL", "FLOAT", "DOUBLE", "REAL", "NUMERIC", "SMALLINT", "TINYINT", "SERIAL"],
  "String": ["VARCHAR", "TEXT", "CHAR", "UUID", "BLOB", "LONGTEXT", "BINARY", "VARBINARY", "ENUM"],
  "Date/Time": ["TIMESTAMP", "DATE", "TIME", "DATETIME", "YEAR", "INTERVAL"],
  "Boolean": ["BOOLEAN"],
  "Network/JSON": ["JSON", "JSONB", "INET", "CIDR", "MACADDR"],
  "Geometry": ["POINT", "LINESTRING", "POLYGON", "GEOMETRY"]
};

const ALL_TYPES = Array.from(new Set(Object.values(TYPE_CATEGORIES).flat())).sort();

const FK_ACTIONS = ["NO ACTION", "CASCADE", "SET NULL", "RESTRICT", "SET DEFAULT"];

const TEMPLATES: Record<string, Table[]> = {
  "To-Do App (Simple)": [
    {
      name: 'tasks',
      description: 'My tasks',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'title', type: 'VARCHAR(255)', nullable: false, comment: 'What needs to be done' },
        { name: 'is_completed', type: 'BOOLEAN', nullable: false, comment: 'Default false' },
        { name: 'due_date', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'tags',
      description: 'Labels for organization',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'name', type: 'VARCHAR(50)', nullable: false, isUnique: true, comment: 'e.g. Work, Personal' },
        { name: 'color', type: 'VARCHAR(7)', comment: 'Hex code' }
      ]
    },
    {
      name: 'task_tags',
      description: 'Many-to-Many link',
      columns: [
        { name: 'task_id', type: 'INT', isForeignKey: true, references: 'tasks.id', relationType: 'N:M', onDelete: 'CASCADE' },
        { name: 'tag_id', type: 'INT', isForeignKey: true, references: 'tags.id', relationType: 'N:M', onDelete: 'CASCADE' }
      ]
    }
  ],
  "School System": [
    {
      name: 'students',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'first_name', type: 'VARCHAR(50)', nullable: false },
        { name: 'last_name', type: 'VARCHAR(50)', nullable: false },
        { name: 'enrollment_date', type: 'DATE' }
      ]
    },
    {
      name: 'courses',
      columns: [
        { name: 'code', type: 'VARCHAR(10)', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'title', type: 'VARCHAR(100)', nullable: false },
        { name: 'credits', type: 'INT', checkConstraint: 'credits > 0' }
      ]
    },
    {
      name: 'enrollments',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'student_id', type: 'INT', isForeignKey: true, references: 'students.id', relationType: 'N:M' },
        { name: 'course_code', type: 'VARCHAR(10)', isForeignKey: true, references: 'courses.code', relationType: 'N:M' },
        { name: 'grade', type: 'CHAR(2)' }
      ]
    }
  ],
  "Simple Blog": [
    {
      name: 'users',
      description: 'Registered users',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'username', type: 'VARCHAR(50)', isUnique: true, nullable: false },
        { name: 'email', type: 'VARCHAR(255)', isUnique: true, nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, comment: 'default now()' }
      ]
    },
    {
      name: 'posts',
      description: 'Blog posts',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'user_id', type: 'INT', isForeignKey: true, references: 'users.id', relationType: '1:N', onDelete: 'CASCADE' },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'content', type: 'TEXT', nullable: true },
        { name: 'is_published', type: 'BOOLEAN', nullable: false }
      ]
    },
    {
      name: 'comments',
      description: 'Comments on posts',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'post_id', type: 'INT', isForeignKey: true, references: 'posts.id', relationType: '1:N', onDelete: 'CASCADE' },
        { name: 'user_id', type: 'INT', isForeignKey: true, references: 'users.id', relationType: '1:N', onDelete: 'SET NULL' },
        { name: 'body', type: 'TEXT', nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false }
      ]
    }
  ],
  "E-commerce": [
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'name', type: 'VARCHAR(100)', nullable: false },
        { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
        { name: 'stock', type: 'INT', nullable: false }
      ]
    },
    {
      name: 'customers',
      columns: [
        { name: 'id', type: 'UUID', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'email', type: 'VARCHAR(255)', nullable: false, isUnique: true },
        { name: 'full_name', type: 'VARCHAR(100)' }
      ]
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'UUID', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'customer_id', type: 'UUID', isForeignKey: true, references: 'customers.id', relationType: '1:N' },
        { name: 'total', type: 'DECIMAL(10,2)', nullable: false },
        { name: 'status', type: 'VARCHAR(20)', checkConstraint: "status IN ('pending', 'paid', 'shipped')" }
      ]
    },
    {
      name: 'order_items',
      columns: [
        { name: 'id', type: 'SERIAL', isPrimaryKey: true, nullable: false, isUnique: true },
        { name: 'order_id', type: 'UUID', isForeignKey: true, references: 'orders.id', relationType: '1:N', onDelete: 'CASCADE' },
        { name: 'product_id', type: 'INT', isForeignKey: true, references: 'products.id', relationType: '1:N' },
        { name: 'quantity', type: 'INT', nullable: false },
        { name: 'price_at_purchase', type: 'DECIMAL(10,2)', nullable: false }
      ]
    }
  ]
};

const parseType = (fullType: string) => {
  const match = fullType.match(/^([a-zA-Z0-9_ ]+)(?:\((.*)\))?$/);
  if (match) {
    return { base: match[1].trim().toUpperCase(), args: match[2] || '' };
  }
  return { base: fullType.toUpperCase() || 'VARCHAR', args: '' };
};

// --- Reusable Components ---

const IconButton = ({ onClick, active, icon: Icon, title, colorClass = "text-primary" }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-md transition-all duration-200 ${
      active 
        ? `bg-slate-800 ${colorClass} shadow-sm border border-slate-700` 
        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
    }`}
  >
    <Icon size={14} strokeWidth={2.5} />
  </button>
);

const StyledInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = "", ...props }, ref) => (
  <input 
    ref={ref}
    className={`bg-background border border-border rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all ${className}`}
    {...props}
  />
));

const TypeAutocomplete = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const filteredTypes = useMemo(() => {
        if (!value) return ALL_TYPES;
        return ALL_TYPES.filter(t => t.toLowerCase().includes(value.toLowerCase()));
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <StyledInput
                    value={value}
                    onChange={(e) => { onChange(e.target.value.toUpperCase()); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Type..."
                    className="w-full font-mono text-[11px] uppercase pr-6"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronsUpDown size={10} />
                </div>
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 w-full min-w-[140px] mt-1 bg-surfaceLight border border-border rounded-md shadow-xl max-h-48 overflow-y-auto z-[60] custom-scrollbar">
                    {filteredTypes.length > 0 ? filteredTypes.map(t => (
                        <button
                            key={t}
                            onClick={() => { onChange(t); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-primary/20 hover:text-white font-mono transition-colors ${value === t ? 'bg-primary/10 text-primary' : 'text-slate-300'}`}
                        >
                            {t}
                        </button>
                    )) : (
                        <div className="px-3 py-2 text-[11px] text-slate-500 italic">No matches</div>
                    )}
                </div>
            )}
        </div>
    );
};

const ReferenceInput: React.FC<{ value: string; onChange: (val: string) => void; schema: DatabaseSchema }> = ({ value, onChange, schema }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const opts: { label: string; type: string }[] = [];
    schema.tables.forEach(t => {
      t.columns.forEach(c => {
        opts.push({ label: `${t.name}.${c.name}`, type: c.type });
      });
    });
    return opts;
  }, [schema]);

  const filteredOptions = useMemo(() => {
    if (!value) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(value.toLowerCase()));
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1" ref={containerRef}>
      <div className="relative">
        <StyledInput
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Target.Column"
          className="w-full pl-7"
        />
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-surfaceLight border border-border rounded-md shadow-xl max-h-40 overflow-y-auto z-50 custom-scrollbar">
          {filteredOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={() => { onChange(opt.label); setIsOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/50 flex justify-between group"
            >
              <span className="text-slate-200">{opt.label}</span>
              <span className="text-slate-500 text-[10px] font-mono">{opt.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Editor Component ---

const Editor: React.FC<EditorProps> = ({ 
  schema, onSchemaChange, onForceLayout, visualConfig, onVisualConfigChange, onExportImage,
  canUndo, canRedo, onUndo, onRedo, onAddNote, theme, onThemeChange
}) => {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set([schema.tables[0]?.name]));
  const [showSql, setShowSql] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedCol, setDraggedCol] = useState<{tIdx: number, cIdx: number} | null>(null);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void; } | null>(null);
  const [showMagic, setShowMagic] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleMagicImport = () => {
    const tables = parseMagicText(magicText);
    if (tables.length > 0) {
        onSchemaChange([...schema.tables, ...tables], true);
        setShowMagic(false);
        setMagicText('');
        setExpandedTables(new Set([...expandedTables, ...tables.map(t => t.name)]));
    }
  };

  // Validate parsed JSON schema before importing
  const validateParsedSchema = (parsed: any): { valid: boolean; errors: string[]; tables: any[] } => {
    if (!parsed) return { valid: false, errors: ['Empty file or invalid JSON'], tables: [] };

    // Accept either { tables: [...] } or an array of tables directly
    let tables: any[] = [];
    if (Array.isArray(parsed)) {
      tables = parsed;
    } else if (parsed && Array.isArray(parsed.tables)) {
      tables = parsed.tables;
    } else {
      return { valid: false, errors: ["JSON must be an object with a 'tables' array or an array of table objects"], tables: [] };
    }

    const errors: string[] = [];
    if (!Array.isArray(tables)) {
      errors.push("'tables' must be an array");
      return { valid: false, errors, tables: [] };
    }

    tables.forEach((t, ti) => {
      if (!t || typeof t !== 'object') {
        errors.push(`Table[${ti}] is not an object`);
        return;
      }
      if (!t.name || typeof t.name !== 'string') errors.push(`Table[${ti}]: missing or invalid 'name'`);
      if (!Array.isArray(t.columns)) {
        errors.push(`Table[${ti}]: 'columns' must be an array`);
      } else {
        t.columns.forEach((c: any, ci: number) => {
          if (!c || typeof c !== 'object') {
            errors.push(`Table[${ti}].Column[${ci}] is not an object`);
            return;
          }
          if (!c.name || typeof c.name !== 'string') errors.push(`Table[${ti}].Column[${ci}]: missing or invalid 'name'`);
          if (!c.type || typeof c.type !== 'string') errors.push(`Table[${ti}].Column[${ci}]: missing or invalid 'type'`);
        });
      }
    });

    return { valid: errors.length === 0, errors, tables };
  };

  // Auto-open help on first visit
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('db-architect-help-seen');
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem('db-architect-help-seen', 'true');
    }
  }, []);

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) newExpanded.delete(tableName);
    else newExpanded.add(tableName);
    setExpandedTables(newExpanded);
  };

  const updateTable = (index: number, updatedTable: Table) => {
    const newTables = [...schema.tables];
    newTables[index] = updatedTable;
    onSchemaChange(newTables);
  };

  const addTable = () => {
    const name = `Table_${schema.tables.length + 1}`;
    const newTable: Table = {
      name,
      columns: [{ 
        name: 'id', 
        type: 'UUID', 
        isPrimaryKey: true, 
        nullable: false, 
        isUnique: true 
      }]
    };
    onSchemaChange([...schema.tables, newTable]);
    setExpandedTables(new Set([...expandedTables, name]));
    setSearchQuery(''); 
  };

  const duplicateTable = (e: React.MouseEvent, tIdx: number) => {
    e.stopPropagation();
    const tableToClone = schema.tables[tIdx];
    let newName = `${tableToClone.name}_copy`;
    // Ensure unique name
    let counter = 1;
    while(schema.tables.some(t => t.name === newName)) {
        newName = `${tableToClone.name}_copy_${counter}`;
        counter++;
    }

    const newTable: Table = {
        ...JSON.parse(JSON.stringify(tableToClone)),
        name: newName
    };
    
    // Insert after current table or at end
    const newTables = [...schema.tables];
    newTables.splice(tIdx + 1, 0, newTable);
    onSchemaChange(newTables);
    setExpandedTables(new Set([...expandedTables, newName]));
  };

  const addPresetColumns = (tIdx: number, type: 'timestamps' | 'uuid_pk' | 'soft_delete') => {
      const table = schema.tables[tIdx];
      let newCols = [...table.columns];

      if (type === 'timestamps') {
          if (!newCols.some(c => c.name === 'created_at')) {
              newCols.push({ name: 'created_at', type: 'TIMESTAMP', nullable: false, comment: 'now()' });
          }
          if (!newCols.some(c => c.name === 'updated_at')) {
              newCols.push({ name: 'updated_at', type: 'TIMESTAMP', nullable: false, comment: 'now()' });
          }
      } else if (type === 'soft_delete') {
          if (!newCols.some(c => c.name === 'deleted_at')) {
              newCols.push({ name: 'deleted_at', type: 'TIMESTAMP', nullable: true });
          }
      } else if (type === 'uuid_pk') {
          // Remove existing PK if any
          newCols = newCols.map(c => ({ ...c, isPrimaryKey: false }));
          // Check if id exists
          const idIdx = newCols.findIndex(c => c.name === 'id');
          const idCol = { name: 'id', type: 'UUID', isPrimaryKey: true, nullable: false, isUnique: true };
          if (idIdx >= 0) {
              newCols[idIdx] = idCol;
          } else {
              newCols.unshift(idCol);
          }
      }

      updateTable(tIdx, { ...table, columns: newCols });
  };

  const loadTemplate = (templateName: string) => {
    setConfirmation({
        message: `Load "${templateName}" template? This will replace your current schema.`,
        onConfirm: () => {
            const template = TEMPLATES[templateName];
            if (template) {
                const templateData = JSON.parse(JSON.stringify(template));
                onSchemaChange(templateData, true); // Pass true to force immediate layout
                setExpandedTables(new Set([templateData[0].name]));
                setShowHelp(false);
            }
        }
    });
  };

  const clearSchema = () => {
     setConfirmation({
         message: 'Are you sure you want to delete all tables? This cannot be undone.',
         onConfirm: () => {
             onSchemaChange([]);
             setShowHelp(false);
         }
     });
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fileData = JSON.stringify(schema, null, 2);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `schema_${timestamp}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPrisma = () => {
      const content = generatePrismaSchema(schema);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'schema.prisma';
      link.href = url;
      link.click();
  };

  const handleExportTypeORM = () => {
      const content = generateTypeORMEntries(schema);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'entities.ts';
      link.href = url;
      link.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        const { valid, errors, tables } = validateParsedSchema(parsed);
        if (!valid) {
          setImportError(errors.join('\n'));
          return;
        }

        // Import is valid
        onSchemaChange(tables, true); // Force layout on import
        setImportError(null);
      } catch (err: any) {
        setImportError('Failed to parse JSON file: ' + (err?.message || String(err)));
      }
    };
    reader.readAsText(file);

    // Reset input value to allow re-importing the same file if needed
    event.target.value = '';
  };

  const onDragStart = (e: React.DragEvent, tIdx: number, cIdx: number) => {
    // Only allow dragging via the handle to prevent interfering with inputs
    if (!(e.target as HTMLElement).closest('.drag-handle')) {
        e.preventDefault();
        return;
    }
    
    setDraggedCol({ tIdx, cIdx });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, targetTIdx: number, targetCIdx: number) => {
    e.preventDefault();
    if (!draggedCol) return;
    
    const { tIdx: sourceTIdx, cIdx: sourceCIdx } = draggedCol;
    
    // Only allow reordering within the same table
    if (sourceTIdx === targetTIdx && sourceCIdx !== targetCIdx) {
        const table = schema.tables[sourceTIdx];
        const newCols = [...table.columns];
        const [movedCol] = newCols.splice(sourceCIdx, 1);
        newCols.splice(targetCIdx, 0, movedCol);
        updateTable(sourceTIdx, { ...table, columns: newCols });
    }
    setDraggedCol(null);
  };

  const generateSQL = (): string => {
    return schema.tables.map(table => {
        const colDefs = table.columns.map(col => {
            let def = `  ${col.name} ${col.type}`;
            if (col.isPrimaryKey) def += ' PRIMARY KEY';
            if (col.isUnique) def += ' UNIQUE';
            if (!col.nullable && !col.isPrimaryKey) def += ' NOT NULL';
            if (col.checkConstraint) def += ` CHECK (${col.checkConstraint})`;
            if (col.comment) def += ` -- ${col.comment}`;
            return def;
        });
        
        const fkDefs = table.columns
            .filter(c => c.isForeignKey && c.references)
            .map(c => {
                let def = `  FOREIGN KEY (${c.name}) REFERENCES ${c.references!.split('.')[0]}(${c.references!.split('.')[1]})`;
                if (c.onDelete && c.onDelete !== "NO ACTION") def += ` ON DELETE ${c.onDelete}`;
                if (c.onUpdate && c.onUpdate !== "NO ACTION") def += ` ON UPDATE ${c.onUpdate}`;
                return def;
            });

        return `CREATE TABLE ${table.name} (\n${[...colDefs, ...fkDefs].join(',\n')}\n);`;
    }).join('\n\n');
  };

  return (
    <div className="flex flex-col h-full bg-surface relative">
      {/* Sidebar Header */}
      <div className="px-5 py-4 border-b border-border bg-surfaceLight/50 backdrop-blur-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-slate-100">
          <div className="p-1.5 bg-primary rounded-lg shadow-lg shadow-primary/20">
            <Database size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide">DB Architect</span>
        </div>
        <div className="flex gap-1 items-center">
             {/* History Controls */}
             <div className="flex bg-slate-800/50 rounded-md mr-2">
                <button 
                    onClick={onUndo} disabled={!canUndo}
                    className={`p-2 rounded-l-md transition-colors ${!canUndo ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={16} />
                </button>
                <div className="w-px bg-slate-700 my-1"></div>
                <button 
                    onClick={onRedo} disabled={!canRedo} 
                    className={`p-2 rounded-r-md transition-colors ${!canRedo ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} 
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={16} />
                </button>
             </div>

             <div className="h-6 w-px bg-border mx-1"></div>

             <button onClick={onAddNote} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Add Sticky Note">
                <StickyNote size={16} />
             </button>
             <button onClick={() => setShowMagic(!showMagic)} className={`p-2 rounded-md transition-colors ${showMagic ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Magic Table (Quick Add)">
                <Wand2 size={16} />
             </button>
             <button onClick={onForceLayout} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Auto Layout">
                <Layout size={16} />
             </button>
             <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Settings">
                <Settings size={16} />
             </button>
             <button onClick={onExportImage} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Export Image (PNG)">
                <ImageIcon size={16} />
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Import Schema (JSON)">
                <FolderOpen size={16} />
             </button>
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
             />
             <button onClick={handleExport} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title="Export Schema (JSON)">
                <Save size={16} />
             </button>
             <div className="h-6 w-px bg-border mx-1"></div>
             <button onClick={handleExportPrisma} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-primary transition-colors" title="Export to Prisma">
                <FileJson size={16} />
             </button>
             <button onClick={handleExportTypeORM} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-blue-400 transition-colors" title="Export to TypeORM">
                <FileCode size={16} />
             </button>
             <div className="h-6 w-px bg-border mx-1"></div>
             <button onClick={() => setShowSql(!showSql)} className={`p-2 rounded-md transition-colors ${showSql ? 'bg-primary/20 text-primary' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="View SQL">
                <Code size={16} />
             </button>
             <button onClick={onThemeChange} className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors" title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button onClick={() => setShowHelp(true)} className={`p-2 rounded-md transition-colors ${showHelp ? 'bg-primary/20 text-primary' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`} title="Help & Guide">
                <HelpCircle size={16} />
             </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="px-4 py-2 bg-surfaceLight/20 border-b border-border">
          <div className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={13} />
              <input 
                  type="text" 
                  placeholder="Filter tables..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-md py-1.5 pl-8 pr-7 text-xs text-slate-200 focus:outline-none focus:border-primary/50 focus:bg-slate-900 transition-all placeholder-slate-600"
              />
              {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      <X size={12} />
                  </button>
              )}
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {schema.tables.map((table, tIdx) => {
            if (searchQuery && !table.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return null;
            }

            const isExpanded = expandedTables.has(table.name);
            return (
                <div key={tIdx} className="bg-surfaceLight border border-border rounded-lg overflow-visible shadow-sm transition-all hover:border-slate-600">
                    {/* Table Header */}
                    <div className="flex items-center gap-2 p-3 bg-slate-800/50 cursor-pointer group" onClick={() => toggleTable(table.name)}>
                        <button className="text-slate-500 hover:text-slate-300 transition-transform duration-200">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <input 
                            value={table.name}
                            onChange={(e) => updateTable(tIdx, { ...table, name: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none focus:text-primary transition-colors flex-1"
                        />
                        <button 
                            onClick={(e) => duplicateTable(e, tIdx)}
                            className="text-slate-600 hover:text-blue-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Duplicate Table"
                        >
                            <Copy size={14} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); const n = [...schema.tables]; n.splice(tIdx, 1); onSchemaChange(n); }}
                            className="text-slate-600 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Table"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                     {/* Columns List */}
                     {isExpanded && (
                        <div className="p-3 pt-0 border-t border-border/50 bg-slate-900/30">
                            {/* Preset Toolbar */}
                            <div className="flex gap-2 mb-2 mt-2 pt-2 border-t border-slate-800/50 justify-end">
                                <button onClick={() => addPresetColumns(tIdx, 'uuid_pk')} className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-primary px-2 py-1 bg-slate-950 rounded border border-slate-800 hover:border-primary/50 transition-colors">
                                    <Sparkles size={10} /> UUID PK
                                </button>
                                <button onClick={() => addPresetColumns(tIdx, 'timestamps')} className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-primary px-2 py-1 bg-slate-950 rounded border border-slate-800 hover:border-primary/50 transition-colors">
                                    <Sparkles size={10} /> Timestamps
                                </button>
                                <button onClick={() => addPresetColumns(tIdx, 'soft_delete')} className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-primary px-2 py-1 bg-slate-950 rounded border border-slate-800 hover:border-primary/50 transition-colors">
                                    <Sparkles size={10} /> Soft Delete
                                </button>
                            </div>

                            {/* Table Description */}
                            <div className="mt-3 px-1">
                                <textarea
                                    value={table.description || ''}
                                    onChange={(e) => updateTable(tIdx, { ...table, description: e.target.value })}
                                    placeholder="Add table description..."
                                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:bg-slate-900 transition-all resize-y min-h-[36px]"
                                    rows={1}
                                />
                            </div>

                            <div className="space-y-3 mt-3">
                                {table.columns.map((col, cIdx) => {
                                    const { base, args } = parseType(col.type);
                                    
                                    const updateCol = (updates: Partial<Column>) => {
                                        const newCols = [...table.columns];
                                        newCols[cIdx] = { ...col, ...updates };
                                        updateTable(tIdx, { ...table, columns: newCols });
                                    };
                                    
                                    const isDragging = draggedCol?.tIdx === tIdx && draggedCol?.cIdx === cIdx;

                                    return (
                                        <div 
                                            key={cIdx} 
                                            draggable
                                            onDragStart={(e) => onDragStart(e, tIdx, cIdx)}
                                            onDragOver={onDragOver}
                                            onDrop={(e) => onDrop(e, tIdx, cIdx)}
                                            className={`bg-background border border-border rounded-md p-2 group shadow-sm hover:border-slate-600 transition-all ${
                                                isDragging ? 'opacity-40 border-dashed border-primary' : ''
                                            }`}
                                        >
                                            {/* Row 1: Basic Info */}
                                            <div className="flex gap-2 mb-2 items-center">
                                                {/* Drag Handle */}
                                                <div className="drag-handle cursor-grab text-slate-600 hover:text-slate-400 p-1 -ml-1 hover:bg-slate-800 rounded active:cursor-grabbing transition-colors">
                                                    <GripVertical size={14} />
                                                </div>

                                                <StyledInput 
                                                    value={col.name}
                                                    onChange={(e) => updateCol({ name: e.target.value })}
                                                    placeholder="col_name"
                                                    className="flex-1 font-medium"
                                                />
                                                <div className="flex gap-1 w-[45%]">
                                                    <div className="flex-1">
                                                        <TypeAutocomplete
                                                            value={base}
                                                            onChange={(newBase) => {
                                                                const newType = args ? `${newBase}(${args})` : newBase;
                                                                updateCol({ type: newType });
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    {["VARCHAR", "CHAR", "DECIMAL", "NUMERIC", "FLOAT"].includes(base) && (
                                                        <StyledInput 
                                                            value={args}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                updateCol({ type: val ? `${base}(${val})` : base });
                                                            }}
                                                            placeholder={base.includes('DECIMAL') ? '10,2' : '255'}
                                                            className="w-14 text-center font-mono"
                                                            title="Length/Precision"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Row 2: Constraints Toolbar */}
                                            <div className="flex items-center justify-between bg-slate-800/50 rounded px-2 py-1 gap-1 ml-6">
                                                <div className="flex gap-1">
                                                    <IconButton 
                                                        icon={Key} 
                                                        active={col.isPrimaryKey} 
                                                        onClick={() => updateCol({ isPrimaryKey: !col.isPrimaryKey, nullable: false })} 
                                                        title="Primary Key"
                                                        colorClass="text-warning"
                                                    />
                                                    <IconButton 
                                                        icon={Link} 
                                                        active={col.isForeignKey} 
                                                        onClick={() => updateCol({ isForeignKey: !col.isForeignKey })} 
                                                        title="Foreign Key"
                                                    />
                                                    <IconButton 
                                                        icon={Ban} 
                                                        active={!col.nullable && !col.isPrimaryKey} 
                                                        onClick={() => updateCol({ nullable: !col.nullable })} 
                                                        title="Not Null (Required)"
                                                        colorClass="text-red-400"
                                                    />
                                                    <div className="w-px h-4 bg-slate-700 mx-1 self-center"></div>
                                                    <IconButton 
                                                        icon={Fingerprint} 
                                                        active={col.isUnique} 
                                                        onClick={() => updateCol({ isUnique: !col.isUnique })} 
                                                        title="Unique"
                                                        colorClass="text-accent"
                                                    />
                                                    <IconButton 
                                                        icon={ShieldAlert} 
                                                        active={!!col.checkConstraint} 
                                                        onClick={() => updateCol({ checkConstraint: col.checkConstraint ? undefined : '' })} 
                                                        title="Check Constraint"
                                                        colorClass="text-success"
                                                    />
                                                    <IconButton 
                                                        icon={MessageSquareText} 
                                                        active={!!col.comment} 
                                                        onClick={() => updateCol({ comment: col.comment ? undefined : '' })} 
                                                        title="Comment"
                                                        colorClass="text-blue-300"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const n = [...table.columns];
                                                        n.splice(cIdx, 1);
                                                        updateTable(tIdx, { ...table, columns: n });
                                                    }}
                                                    className="text-slate-600 hover:text-red-500 p-1 rounded transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>

                                            {/* Row 3: Conditional Inputs */}
                                            {(col.isForeignKey || col.checkConstraint !== undefined || col.comment !== undefined) && (
                                                <div className="mt-2 space-y-2 p-2 bg-slate-900/50 rounded border border-slate-800 text-[11px] ml-6">
                                                    {col.isForeignKey && (
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div className="flex gap-2 items-center">
                                                                <span className="text-slate-500 w-12">Ref:</span>
                                                                <ReferenceInput 
                                                                    value={col.references || ''}
                                                                    onChange={(val) => updateCol({ references: val })}
                                                                    schema={schema}
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={col.relationType || '1:N'}
                                                                    onChange={(e) => updateCol({ relationType: e.target.value as any })}
                                                                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 w-20 focus:outline-none"
                                                                >
                                                                    <option value="1:1">1:1</option>
                                                                    <option value="1:N">1:N</option>
                                                                    <option value="N:M">N:M</option>
                                                                </select>
                                                                <StyledInput 
                                                                    value={col.relationLabel || ''}
                                                                    onChange={(e) => updateCol({ relationLabel: e.target.value })}
                                                                    placeholder="Label (e.g. 'owns')"
                                                                    className="flex-1"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-slate-800">
                                                                <div>
                                                                    <span className="text-[10px] text-slate-500 mb-1 block">On Delete</span>
                                                                    <select 
                                                                        value={col.onDelete || 'NO ACTION'}
                                                                        onChange={(e) => updateCol({ onDelete: e.target.value })}
                                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                                                                    >
                                                                        {FK_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] text-slate-500 mb-1 block">On Update</span>
                                                                    <select 
                                                                        value={col.onUpdate || 'NO ACTION'}
                                                                        onChange={(e) => updateCol({ onUpdate: e.target.value })}
                                                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                                                                    >
                                                                        {FK_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {col.checkConstraint !== undefined && (
                                                        <div className="flex gap-2 items-center">
                                                             <ShieldAlert size={12} className="text-success" />
                                                             <StyledInput 
                                                                value={col.checkConstraint}
                                                                onChange={(e) => updateCol({ checkConstraint: e.target.value })}
                                                                placeholder="Expression (e.g. age > 18)"
                                                                className="flex-1"
                                                             />
                                                        </div>
                                                    )}
                                                    {col.comment !== undefined && (
                                                        <div className="flex gap-2 items-center">
                                                             <MessageSquareText size={12} className="text-blue-300" />
                                                             <StyledInput 
                                                                value={col.comment}
                                                                onChange={(e) => updateCol({ comment: e.target.value })}
                                                                placeholder="Description..."
                                                                className="flex-1"
                                                             />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button 
                                    onClick={() => {
                                        const n = [...table.columns, { name: 'new_col', type: 'VARCHAR' }];
                                        updateTable(tIdx, { ...table, columns: n });
                                    }}
                                    className="w-full py-2 border border-dashed border-slate-700 rounded text-xs text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
                                >
                                    <Plus size={14} /> Add Column
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
        
        <button 
            onClick={addTable}
            className="w-full py-3 bg-primary hover:bg-primaryHover text-white rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 font-medium transition-all transform active:scale-95"
        >
            <Plus size={18} /> New Table
        </button>

        <div className="h-10"></div> {/* Spacer */}
      </div>

      {/* SQL Preview Drawer */}
      {showSql && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-surfaceLight w-full max-w-3xl max-h-full rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-border bg-slate-900">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                        <Code size={18} className="text-primary" /> Generated SQL
                    </h3>
                    <button onClick={() => setShowSql(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-0 overflow-auto bg-[#0d1117] custom-scrollbar">
                    <pre className="p-6 text-sm font-mono text-slate-300 leading-relaxed selection:bg-primary/30">
                        {generateSQL()}
                    </pre>
                </div>
            </div>
        </div>
      )}

      {/* Settings Drawer/Modal */}
      {showSettings && visualConfig && onVisualConfigChange && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-surfaceLight w-full max-w-sm rounded-xl shadow-2xl border border-border flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border bg-slate-900 rounded-t-xl">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                        <Settings size={18} className="text-primary" /> Diagram Settings
                    </h3>
                    <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-200 mb-3">Relationship Colors</h4>
                        <div className="space-y-3">
                            {[
                                { label: 'One-to-One (1:1)', key: '1:1' },
                                { label: 'One-to-Many (1:N)', key: '1:N' },
                                { label: 'Many-to-Many (N:M)', key: 'N:M' }
                            ].map(({ label, key }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">{label}</span>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={visualConfig.relationshipColors[key as keyof typeof visualConfig.relationshipColors]}
                                            onChange={(e) => onVisualConfigChange({
                                                ...visualConfig,
                                                relationshipColors: {
                                                    ...visualConfig.relationshipColors,
                                                    [key]: e.target.value
                                                }
                                            })}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                        />
                                        <span className="text-xs font-mono text-slate-500 w-16 uppercase">
                                            {visualConfig.relationshipColors[key as keyof typeof visualConfig.relationshipColors]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-border bg-slate-900/50 rounded-b-xl flex justify-end">
                    <button 
                        onClick={() => setShowSettings(false)} 
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-surfaceLight w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-4 border-b border-border bg-slate-900 rounded-t-xl">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                        <HelpCircle size={18} className="text-primary" /> Guide & Shortcuts
                    </h3>
                    <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Templates Section */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-primary/20">
                        <h4 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                            <Play size={14} className="text-primary" fill="currentColor" /> Quick Start
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                             {Object.keys(TEMPLATES).map(t => (
                                <button 
                                    key={t} 
                                    onClick={() => loadTemplate(t)}
                                    className="flex items-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded text-xs text-slate-200 transition-all text-left group"
                                >
                                    <div className="p-1.5 bg-primary/10 group-hover:bg-primary/20 rounded text-primary">
                                        <BookOpen size={14} />
                                    </div>
                                    <span>Load {t}</span>
                                </button>
                             ))}
                             <button 
                                onClick={clearSchema}
                                className="flex items-center gap-2 p-2 bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 rounded text-xs text-slate-200 transition-all text-left group"
                             >
                                <div className="p-1.5 bg-red-500/10 group-hover:bg-red-500/20 rounded text-red-400">
                                    <Eraser size={14} />
                                </div>
                                <span>Clear All</span>
                             </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic text-center">
                            Note: Loading a template will replace your current work.
                        </p>
                    </div>

                    <div className="space-y-4">
                         {/* Section 1: Basics */}
                         <div>
                            <h4 className="text-sm font-bold text-slate-100 mb-2 border-b border-slate-700 pb-1">1. Getting Started</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Use the sidebar on the left to add tables. Click <strong>"New Table"</strong> to create a fresh table. 
                                Expand a table to edit its columns.
                            </p>
                        </div>

                        {/* Section 2: Columns */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-100 mb-2 border-b border-slate-700 pb-1">2. Defining Columns</h4>
                            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                                <li><strong>Name:</strong> Enter the column name (e.g., <code className="bg-slate-800 px-1 rounded">user_id</code>).</li>
                                <li><strong>Type:</strong> Select SQL types (UUID, VARCHAR, INT, etc.).</li>
                                <li><strong>Constraints:</strong> Use the toolbar icons for common constraints.</li>
                            </ul>
                        </div>

                        {/* Section 3: Legend */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-100 mb-2 border-b border-slate-700 pb-1">3. Toolbar Legend</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <div className="p-1 bg-slate-800 rounded"><Key size={12} className="text-warning"/></div> Primary Key
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <div className="p-1 bg-slate-800 rounded"><Link size={12} className="text-primary"/></div> Foreign Key (Link)
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <div className="p-1 bg-slate-800 rounded"><Ban size={12} className="text-red-400"/></div> Not Null
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <div className="p-1 bg-slate-800 rounded"><Fingerprint size={12} className="text-accent"/></div> Unique
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <div className="p-1 bg-slate-800 rounded"><ShieldAlert size={12} className="text-success"/></div> Check Constraint
                                </div>
                            </div>
                        </div>

                         {/* Section 4: Relationships */}
                         <div>
                            <h4 className="text-sm font-bold text-slate-100 mb-2 border-b border-slate-700 pb-1">4. Creating Relationships</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                To link two tables, toggle the <strong>Foreign Key</strong> (Link icon) on a column. 
                                In the inputs that appear, type the target in <code className="bg-slate-800 px-1 rounded">Table.Column</code> format 
                                (e.g., <code className="bg-slate-800 px-1 rounded">Users.id</code>). A line will automatically appear on the diagram.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-border bg-slate-900/50 rounded-b-xl flex justify-end">
                    <button 
                        onClick={() => setShowHelp(false)} 
                        className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmation && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200">
            <div className="bg-surfaceLight w-full max-w-sm rounded-xl shadow-2xl border border-border p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-primary">
                    <AlertTriangle size={24} />
                </div>
                <h3 className="font-bold text-slate-100 text-lg mb-2">Confirm Action</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">{confirmation.message}</p>
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => setConfirmation(null)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { confirmation.onConfirm(); setConfirmation(null); }}
                        className="flex-1 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-primary/20"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
      )}

        {/* Import Error Modal */}
        {importError && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="bg-surfaceLight w-full max-w-md rounded-xl shadow-2xl border border-border p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-100">Import Error</h3>
              <button onClick={() => setImportError(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="bg-[#0d1117] p-4 rounded text-xs text-slate-300 max-h-56 overflow-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap">{importError}</pre>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setImportError(null)} className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
        )}
    </div>
  );
};

export default Editor;