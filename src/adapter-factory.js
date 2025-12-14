import { register, list, create } from './core/registry.js';
import { FolderAdapter } from './adapters/folder-adapter.js';
import { ensureDesktopFolder } from './folders.js';
import logger from '@sequentialos/sequential-logging';

let initialized = false;

async function registerBuiltInAdapters() {
  if (initialized) return;
  initialized = true;

  register('adapter', 'folder', (config) => new FolderAdapter(config.basePath));

  try {
    const { SQLiteAdapter } = await import('sequential-adaptor-sqlite');
    register('adapter', 'sqlite', (config) => new SQLiteAdapter(config.dbPath));
  } catch {}

  try {
    const { SupabaseAdapter } = await import('sequential-adaptor-supabase');
    register('adapter', 'supabase', (config) => new SupabaseAdapter(
      config.url || process.env.SUPABASE_URL,
      config.serviceKey || process.env.SUPABASE_SERVICE_KEY,
      config.anonKey || process.env.SUPABASE_ANON_KEY
    ));
  } catch {}
}

export function registerAdapter(name, factory) {
  register('adapter', name, factory);
}

export function getRegisteredAdapters() {
  return list('adapter');
}

export async function createAdapter(backend, config = {}) {
  await registerBuiltInAdapters();
  const adapter = create('adapter', backend, config);
  try {
    await ensureDesktopFolder(adapter);
  } catch (e) {
    logger.warn('Failed to ensure desktop folder:', e);
  }
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
