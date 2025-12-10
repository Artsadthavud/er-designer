import { DatabaseSchema, Table } from '../types';

export const generateMockData = (schema: DatabaseSchema, rows: number = 10) => {
    const data: Record<string, any[]> = {};

    schema.tables.forEach(table => {
        data[table.name] = Array.from({ length: rows }).map((_, i) => generateRow(table, i));
    });

    return data;
};

const generateRow = (table: Table, index: number) => {
    const row: Record<string, any> = {};
    table.columns.forEach(col => {
        row[col.name] = generateValue(col.name, col.type, index);
    });
    return row;
};

const generateValue = (colName: string, type: string, index: number) => {
    const t = type.toUpperCase();
    const n = colName.toLowerCase();

    // Specific Name Helpers
    if (n.includes('email')) return `user${index + 1}@example.com`;
    if (n.includes('name')) return `User ${index + 1}`;
    if (n.includes('phone')) return `+1-555-01${String(index).padStart(2, '0')}`;

    // ID Handling
    if (t.includes('UUID')) return crypto.randomUUID();
    if (t.includes('INT') || t.includes('SERIAL')) return index + 1;

    // Type Handling
    if (t.includes('VARCHAR') || t.includes('TEXT') || t.includes('STRING')) return `Test ${colName} ${index + 1}`;
    if (t.includes('BOOL')) return Math.random() > 0.5;
    if (t.includes('DATE') || t.includes('TIMESTAMP')) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 365));
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    if (t.includes('DECIMAL') || t.includes('FLOAT') || t.includes('NUMERIC')) return (Math.random() * 1000).toFixed(2);

    return null;
};

export const generateSQLInserts = (data: Record<string, any[]>) => {
    let sql = '';

    Object.entries(data).forEach(([tableName, rows]) => {
        if (rows.length === 0) return;

        const cols = Object.keys(rows[0]).join(', ');

        // Group inserts to avoid massive query string, 10 per batch? Or just 1 big one for now.
        // Let's do Standard SQL: INSERT INTO table (cols) VALUES (v1), (v2);

        const values = rows.map(row => {
            const vals = Object.values(row).map(v => {
                if (v === null) return 'NULL';
                if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
                if (typeof v === 'number') return v;
                return `'${String(v).replace(/'/g, "''")}'`; // Escape single quotes
            }).join(', ');
            return `(${vals})`;
        }).join(',\n  ');

        sql += `INSERT INTO ${tableName} (${cols}) VALUES\n  ${values};\n\n`;
    });

    return sql;
};
