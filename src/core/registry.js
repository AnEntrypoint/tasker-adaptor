export const registries = {
  adapter: new Map(),
  runner: new Map(),
  service: new Map(),
  command: new Map(),
  loader: new Map()
};

export function register(type, name, factory) {
  if (!registries[type]) throw new Error(`Unknown registry type: ${type}`);
  if (typeof factory !== 'function') throw new Error(`Factory must be a function`);
  registries[type].set(name, factory);
}

export function get(type, name) {
  if (!registries[type]) throw new Error(`Unknown registry type: ${type}`);
  return registries[type].get(name);
}

export function list(type) {
  if (!registries[type]) throw new Error(`Unknown registry type: ${type}`);
  return Array.from(registries[type].keys());
}

export function has(type, name) {
  if (!registries[type]) throw new Error(`Unknown registry type: ${type}`);
  return registries[type].has(name);
}

export async function create(type, name, config = {}) {
  const factory = get(type, name);
  if (!factory) {
    throw new Error(`${type} '${name}' not found. Available: ${list(type).join(', ')}`);
  }
  const instance = await factory(config);
  if (instance.init && typeof instance.init === 'function') {
    await instance.init();
  }
  return instance;
}

export async function loadPlugins(pluginPaths) {
  for (const pluginPath of pluginPaths) {
    try {
      const plugin = await import(pluginPath);
      if (plugin.register && typeof plugin.register === 'function') {
        plugin.register({ register, get, list, has });
      }
    } catch (e) {
      throw new Error(`Failed to load plugin ${pluginPath}: ${e.message}`);
    }
  }
}
