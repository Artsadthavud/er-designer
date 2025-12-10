
export interface Column {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: string; // Format: "TableName.ColumnName"
  nullable?: boolean;
  relationType?: '1:1' | '1:N' | 'N:M';
  relationLabel?: string;
  isUnique?: boolean;
  checkConstraint?: string;
  comment?: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface Table {
  name: string;
  description?: string;
  columns: Column[];
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string;
  label?: string;
}

export interface Note {
  id: string;
  content: string;
  x: number;
  y: number;
  color?: string;
}

export interface DatabaseSchema {
  tables: Table[];
  relationships: Relationship[];
  notes?: Note[];
}

export interface VisualConfig {
  relationshipColors: {
    '1:1': string;
    '1:N': string;
    'N:M': string;
    'default': string;
  };
}
