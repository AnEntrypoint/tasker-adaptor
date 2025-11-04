import { FolderAdapter } from './adapters/folder-adapter.js';

const adapterRegistry = new Map();

async function registerBuiltInAdapters() {
  registerAdapter('folder', (config) => new FolderAdapter(config.basePath || './tasks'));

  try {
    const { SQLiteAdapter } = await import('tasker-adaptor-sqlite');
    registerAdapter('sqlite', (config) => new SQLiteAdapter(config.dbPath || './tasks.db'));
  } catch (e) {
  }

  try {
    const { SupabaseAdapter } = await import('tasker-adaptor-supabase');
    registerAdapter('supabase', (config) => new SupabaseAdapter(
      config.url || process.env.SUPABASE_URL || '',
      config.serviceKey || process.env.SUPABASE_SERVICE_KEY || '',
      config.anonKey || process.env.SUPABASE_ANON_KEY || ''
    ));
  } catch (e) {
  }
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
    await registerBuiltInAdapters();
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
