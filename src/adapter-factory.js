import { SQLiteAdapter } from 'tasker-adaptor-sqlite';
import { SupabaseAdapter } from 'tasker-adaptor-supabase';

const adapterRegistry = new Map();

function registerBuiltInAdapters() {
  registerAdapter('sqlite', (config) => new SQLiteAdapter(config.dbPath || './tasks.db'));
  registerAdapter('supabase', (config) => new SupabaseAdapter(
    config.url || process.env.SUPABASE_URL || '',
    config.serviceKey || process.env.SUPABASE_SERVICE_KEY || '',
    config.anonKey || process.env.SUPABASE_ANON_KEY || ''
  ));
}

export function registerAdapter(name, factory) {
  if (typeof factory !== 'function') {
    throw new Error(`Adapter factory must be a function, got ${typeof factory}`);
  }
  adapterRegistry.set(name, factory);
}

export function getRegisteredAdapters() {
  return Array.from(adapterRegistry.keys());
}

export async function createAdapter(backend, config = {}) {
  if (adapterRegistry.size === 0) {
    registerBuiltInAdapters();
  }

  const factory = adapterRegistry.get(backend);
  if (!factory) {
    const available = getRegisteredAdapters().join(', ');
    throw new Error(`Unsupported backend '${backend}'. Available: ${available}`);
  }

  const adapter = factory(config);
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
