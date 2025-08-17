import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export default async function SchemaAuditPage() {
  // Check what publisher tables actually exist in the database
  const tables = await db.execute(sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name LIKE 'publisher%'
    ORDER BY table_name, ordinal_position
  `);

  // Group by table
  const tableStructure = tables.rows.reduce((acc: any, row: any) => {
    if (!acc[row.table_name]) {
      acc[row.table_name] = [];
    }
    acc[row.table_name].push({
      column: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
      default: row.column_default
    });
    return acc;
  }, {});

  // Check for foreign key relationships
  const relationships = await db.execute(sql`
    SELECT 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name LIKE 'publisher%'
  `);

  // Check row counts
  const counts: any = {};
  for (const tableName of Object.keys(tableStructure)) {
    const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
    counts[tableName] = result.rows[0].count;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Publisher Schema Audit - Database Reality Check</h1>
      
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-8">
        <p className="font-bold">This shows what's ACTUALLY in the database right now</p>
      </div>

      <div className="space-y-8">
        {Object.entries(tableStructure).map(([tableName, columns]: [string, any]) => (
          <div key={tableName} className="border rounded-lg p-6 bg-white shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{tableName}</h2>
              <span className="text-sm bg-blue-100 px-3 py-1 rounded">
                {counts[tableName]} rows
              </span>
            </div>
            
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Column</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Nullable</th>
                  <th className="text-left py-2">Default</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col: any) => (
                  <tr key={col.column} className="border-b">
                    <td className="py-2 font-mono">{col.column}</td>
                    <td className="py-2">{col.type}</td>
                    <td className="py-2">{col.nullable}</td>
                    <td className="py-2 text-xs">{col.default || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Show relationships for this table */}
            {relationships.rows.filter((r: any) => r.table_name === tableName).length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold text-sm mb-2">Foreign Keys:</p>
                {relationships.rows
                  .filter((r: any) => r.table_name === tableName)
                  .map((r: any, i: number) => (
                    <p key={i} className="text-xs font-mono">
                      {r.column_name} → {r.foreign_table_name}.{r.foreign_column_name}
                    </p>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(tableStructure).length === 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4">
          <p className="font-bold">No publisher tables found in database!</p>
        </div>
      )}
    </div>
  );
}