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

function getConfig() {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  return { projectRef, accessToken };
}

const SQLITE_TO_PG: [RegExp, string][] = [
  [/MAX\(0,\s*([^)]+?)\s*-\s*1\)/gi, 'GREATEST(0, $1 - 1)'],
  [/datetime\('now',\s*'([^']+)'\)/gi, "NOW() - INTERVAL '$1'"],
  [/datetime\('now'\)/gi, 'NOW()'],
  [/CURRENT_TIMESTAMP/gi, 'NOW()'],
];

async function executeQuery({ sql, args }: { sql: string; args?: any[] }) {
  const { projectRef, accessToken } = getConfig();
  if (!projectRef || !accessToken) {
    // Fallback to supabase-js for basic CRUD (for build time only)
    return { rows: [] };
  }

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

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DB error: ${err}`);
  }

  const data = await response.json();
  return { rows: Array.isArray(data) ? data : [] };
}

export default { execute: executeQuery };
