import { createClient } from '@supabase/supabase-js';

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      _supabase = createClient(supabaseUrl, supabaseKey);
    }
  }
  return _supabase;
}

export { getSupabase };

const SQLITE_TO_PG: [RegExp, string][] = [
  [/MAX\(0,\s*([^)]+?)\s*-\s*1\)/gi, 'GREATEST(0, $1 - 1)'],
  [/datetime\('now',\s*'([^']+)'\)/gi, "NOW() - INTERVAL '$1'"],
  [/datetime\('now'\)/gi, 'NOW()'],
  [/CURRENT_TIMESTAMP/gi, 'NOW()'],
];

async function executeQuery({ sql, args }: { sql: string; args?: any[] }) {
  const supabase = getSupabase();
  if (!supabase) return { rows: [] };

  let query = sql;

  if (args && args.length > 0) {
    let i = 0;
    query = query.replace(/\?/g, () => {
      const val = args[i++];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? '1' : '0';
      return `'${String(val).replace(/'/g, "''")}'`;
    });
  }

  for (const [pattern, replacement] of SQLITE_TO_PG) {
    query = query.replace(pattern, replacement);
  }

  const trimmed = query.trim().toUpperCase();
  const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
  const isReturning = trimmed.includes('RETURNING');

  if (isSelect || isReturning) {
    const { data, error } = await supabase.rpc('exec_sql', { sql: query });
    if (error) throw new Error(`DB error: ${error.message}`);
    return { rows: Array.isArray(data) ? data : [] };
  } else {
    const { error } = await supabase.rpc('exec_dml', { sql: query });
    if (error) throw new Error(`DB error: ${error.message}`);
    return { rows: [] };
  }
}

export default { execute: executeQuery };
