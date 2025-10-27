import { SQLiteAdapter } from 'tasker-adaptor-sqlite';
import { SupabaseAdapter } from 'tasker-adaptor-supabase';

export async function createAdapter(backend, config = {}) {
  let adapter;

  if (backend === 'sqlite') {
    const dbPath = config.dbPath || './tasks.db';
    adapter = new SQLiteAdapter(dbPath);
  } else if (backend === 'supabase') {
    const url = config.url || process.env.SUPABASE_URL || '';
    const serviceKey = config.serviceKey || process.env.SUPABASE_SERVICE_KEY || '';
    const anonKey = config.anonKey || process.env.SUPABASE_ANON_KEY || '';
    adapter = new SupabaseAdapter(url, serviceKey, anonKey);
  } else {
    throw new Error(`Unsupported backend: ${backend}`);
  }

  await adapter.init();
  return adapter;
}

export async function withAdapter(backend, config, fn) {
  const adapter = await createAdapter(backend, config);
  try {
    return await fn(adapter);
  } finally {
    await adapter.close();
  }
}
