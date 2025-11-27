# Sequential Adaptor

Plugin registry and storage adapters for sequential-ecosystem.

## Installation

```bash
npm install sequential-adaptor
```

## Plugin Registry

Central registry for adapters, runners, services, commands, and loaders:

```javascript
import { register, create, list, has, loadPlugins } from 'sequential-adaptor';

register('adapter', 'mydb', (config) => new MyDBAdapter(config));
register('runner', 'custom', (config) => new CustomRunner(config));
register('service', 'alias', () => 'endpoint-name');
register('command', 'mycmd', () => myCommandDef);

const adapter = await create('adapter', 'mydb', { uri: '...' });
const runner = await create('runner', 'custom', {});

await loadPlugins(['./my-plugin.js']);
```

## Storage Adapters

```javascript
import { createAdapter, registerAdapter, getRegisteredAdapters } from 'sequential-adaptor';

const folder = await createAdapter('folder', { basePath: './tasks' });
const sqlite = await createAdapter('sqlite', { dbPath: './tasks.db' });
const supabase = await createAdapter('supabase', {
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_KEY
});

registerAdapter('mongodb', (config) => new MongoAdapter(config));
```

Built-in: `folder` (default), `sqlite`, `supabase`

## Runners

```javascript
import { createRunner, registerRunner, getRegisteredRunners } from 'sequential-adaptor';

const fetchRunner = await createRunner('fetch', {});
const flowRunner = await createRunner('flow', {});
const containerRunner = await createRunner('container', { stateDir: '.statekit' });

registerRunner('custom', (config) => new CustomRunner(config));
```

Built-in: `fetch` (implicit xstate), `flow` (explicit xstate), `container` (StateKit)

## Service Client

```javascript
import { ServiceClient } from 'sequential-adaptor';

ServiceClient.registerService('database', 'wrappedsupabase');
ServiceClient.registerService('openai', 'wrappedopenai');

const client = new ServiceClient({
  baseUrl: process.env.SERVICE_BASE_URL,
  authToken: process.env.SERVICE_AUTH_TOKEN
});

const result = await client.call('database', 'getUsers', { limit: 10 });
```

## Storage Adapter Interface

```javascript
import { StorageAdapter } from 'sequential-adaptor';

class MyAdapter extends StorageAdapter {
  async init() {}
  async createTaskRun(taskRun) {}
  async getTaskRun(id) {}
  async updateTaskRun(id, updates) {}
  async queryTaskRuns(filter) {}
  async createStackRun(stackRun) {}
  async getStackRun(id) {}
  async updateStackRun(id, updates) {}
  async queryStackRuns(filter) {}
  async getPendingStackRuns() {}
  async storeTaskFunction(taskFunction) {}
  async getTaskFunction(identifier) {}
  async setKeystore(key, value) {}
  async getKeystore(key) {}
  async deleteKeystore(key) {}
  async close() {}
}
```

## Runner Interface

```javascript
import { Runner } from 'sequential-adaptor';

class MyRunner extends Runner {
  async init() {}
  async run(code, input) {}
  async resume(state, response) {}
  async status() {}
  async dispose() {}
}
```

## Exports

```javascript
import {
  register, get, list, has, create, loadPlugins, registries,
  StorageAdapter, Runner,
  ServiceClient,
  TaskExecutor, StackProcessor,
  createAdapter, registerAdapter, getRegisteredAdapters, withAdapter,
  createRunner, registerRunner, getRegisteredRunners,
  FolderAdapter
} from 'sequential-adaptor';
```

## Backend Packages

- `sequential-adaptor-sqlite` - SQLite storage
- `sequential-adaptor-supabase` - Supabase PostgreSQL storage

## License

MIT
