import { Table, Column } from '../types';

export const parseSQL = (sqlContent: string): Table[] => {
    const tables: Table[] = [];

    // Cleanup comments
    const cleanSQL = sqlContent.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Regex to find CREATE TABLE statements
    // Matches: CREATE TABLE [IF NOT EXISTS] name ( content ) ... ;
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\)(?:[^;]*);/gim;

    let match;
    while ((match = tableRegex.exec(cleanSQL)) !== null) {
        const tableName = match[1];
        const body = match[2];
        const columns: Column[] = [];

        // Split body by comma, but be careful of commas inside parentheses (e.g. DECIMAL(10,2))
        // Simple safe split for now: split by comma if not inside parens
        const lines = splitSqlArguments(body);

        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            // Skip PRIMARY KEY (...) constraints defined at table level for now (too complex for regex simple parser)
            // But we can try to detect them.
            if (/^PRIMARY\s+KEY/i.test(line) || /^CONSTRAINT/i.test(line) || /^FOREIGN\s+KEY/i.test(line) || /^KEY/i.test(line) || /^INDEX/i.test(line) || /^UNIQUE/i.test(line)) {
                // TODO: Parse table level constraints
                return;
            }

            // Assume column definition: Name Type [Constraints]
            // e.g. "id INT PRIMARY KEY"
            // e.g. "`name` VARCHAR(255) NOT NULL"

            const parts = line.split(/\s+/);
            if (parts.length < 2) return;

            const rawName = parts[0];
            const name = rawName.replace(/["`]/g, '');
            const type = parts[1];

            // Remaining parts are constraints
            const constraints = parts.slice(2).join(' ').toUpperCase();

            const col: Column = {
                name,
                type: type.replace(/,$/, ''), // Remove potential trailing comma
                nullable: true
            };

            if (constraints.includes('NOT NULL')) col.nullable = false;
            if (constraints.includes('PRIMARY KEY')) {
                col.isPrimaryKey = true;
                col.nullable = false;
            }
            if (constraints.includes('UNIQUE')) col.isUnique = true;
            if (constraints.includes('DEFAULT')) {
                // Try extract default?
                // col.defaultValue = ...
            }

            columns.push(col);
        });

        tables.push({
            name: tableName,
            columns
        });
    }

    return tables;
};

// Helper to split by comma ignoring parentheses
function splitSqlArguments(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let parenCount = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;

        if (char === ',' && parenCount === 0) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) result.push(current);

    return result;
}
