import { Table, Column } from '../types';

export const parseMagicText = (text: string): Table[] => {
    const tables: Table[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    let currentTable: Table | null = null;

    lines.forEach(line => {
        // Check if line ends with colon -> Table Name
        if (line.endsWith(':')) {
            const name = line.replace(':', '').trim();
            currentTable = {
                name,
                columns: []
            };
            tables.push(currentTable);
            return;
        }

        // Otherwise, assume it's a column definition
        // Format: name type modifiers...
        // e.g. "email varchar(255) unique not null"
        // e.g. "id serial pk"
        if (currentTable) {
            // Remove trailing commas if user typed them list style
            const cleanLine = line.replace(/,$/, '');
            const parts = cleanLine.split(/\s+/);

            if (parts.length >= 2) {
                const name = parts[0];
                const typeRaw = parts[1].toUpperCase();

                // Map shorthand types
                let type = typeRaw;
                if (['TEXT', 'STRING'].includes(typeRaw)) type = 'VARCHAR(255)';
                if (['INT', 'INTEGER', 'NUMBER'].includes(typeRaw)) type = 'INT';
                if (['BOOL'].includes(typeRaw)) type = 'BOOLEAN';
                if (['PK', 'ID'].includes(typeRaw)) type = 'SERIAL'; // Shorthand

                const col: Column = {
                    name,
                    type,
                    nullable: true // default
                };

                // Parse modifiers
                const modifiers = parts.slice(2).join(' ').toLowerCase();

                if (modifiers.includes('pk') || modifiers.includes('primary')) {
                    col.isPrimaryKey = true;
                    col.nullable = false;
                }
                if (modifiers.includes('uniq')) col.isUnique = true;
                if (modifiers.includes('not null') || modifiers.includes('required')) col.nullable = false;
                if (modifiers.includes('fk') || modifiers.includes('ref')) col.isForeignKey = true; // Simple marker, ref parsing is hard without syntax

                // Check if shorthand was actually defining PK
                if (typeRaw === 'SERIAL' || typeRaw === 'UUID') {
                    // Often implies PK if first col, but let's stick to explicit modifiers or simple convention?
                    // logic: if name is 'id' and type is serial/uuid, assume pk default 50%?
                    // Let's rely on modifiers for now for safety, or user explicit typing 'pk'
                }
                if (parts.includes('pk') || parts.includes('PK')) {
                    col.isPrimaryKey = true;
                    col.nullable = false;
                }

                currentTable.columns.push(col);
            }
        }
    });

    return tables;
};
