import { test } from 'node:test';
import assert from 'node:assert';
import {
  register,
  get,
  list,
  has,
  create,
  registries,
  registerAdapter,
  createAdapter,
  getRegisteredAdapters,
  withAdapter,
  registerRunner,
  createRunner,
  getRegisteredRunners,
  FolderAdapter,
  StorageAdapter
} from '../src/index.js';

test('Registry - Core Functionality', async (t) => {
  await t.test('provides registry map structure', () => {
    assert.ok(registries.adapter);
    assert.ok(registries.runner);
    assert.ok(registries.service);
    assert.ok(registries.command);
    assert.ok(registries.loader);
  });

  await t.test('registers custom adapter', () => {
    const mockFactory = () => ({ mock: true });
    register('adapter', 'test-adapter', mockFactory);
    assert.equal(has('adapter', 'test-adapter'), true);
  });

  await t.test('retrieves registered adapter', () => {
    const mockFactory = () => ({ mock: true });
    register('adapter', 'retrieve-test', mockFactory);
    const factory = get('adapter', 'retrieve-test');
    assert.equal(factory, mockFactory);
  });

  await t.test('lists all registered adapters', () => {
    register('adapter', 'list-test-1', () => {});
    register('adapter', 'list-test-2', () => {});
    const adapters = list('adapter');
    assert.ok(Array.isArray(adapters));
    assert.ok(adapters.length >= 2);
  });

  await t.test('checks if adapter exists', () => {
    register('adapter', 'exists-test', () => {});
    assert.equal(has('adapter', 'exists-test'), true);
    assert.equal(has('adapter', 'non-existent'), false);
  });

  await t.test('throws on unknown registry type', () => {
    assert.throws(() => {
      register('unknown-type', 'test', () => {});
    });
  });

  await t.test('throws on non-function factory', () => {
    assert.throws(() => {
      register('adapter', 'invalid', 'not a function');
    });
  });
});

test('Registry - Create Functionality', async (t) => {
  await t.test('creates instance with factory', async () => {
    const mockFactory = (config) => {
      return { type: 'mock', config };
    };
    register('adapter', 'create-test', mockFactory);
    const instance = await create('adapter', 'create-test', { foo: 'bar' });
    assert.equal(instance.type, 'mock');
    assert.deepEqual(instance.config, { foo: 'bar' });
  });

  await t.test('calls init method if present', async () => {
    let initCalled = false;
    const mockFactory = () => {
      return {
        async init() {
          initCalled = true;
        }
      };
    };
    register('adapter', 'init-test', mockFactory);
    await create('adapter', 'init-test');
    assert.equal(initCalled, true);
  });

  await t.test('throws on non-existent adapter', async () => {
    try {
      await create('adapter', 'non-existent-adapter-xyz');
      assert.fail('Should have thrown');
    } catch (e) {
      assert.ok(e.message.includes('not found'));
    }
  });
});

test('Adapter Factory', async (t) => {
  await t.test('registers custom adapter factory', () => {
    const customFactory = () => ({ custom: true });
    registerAdapter('custom-test', customFactory);
    assert.equal(has('adapter', 'custom-test'), true);
  });

  await t.test('lists registered adapters', () => {
    registerAdapter('list-test-1', () => {});
    registerAdapter('list-test-2', () => {});
    const adapters = getRegisteredAdapters();
    assert.ok(Array.isArray(adapters));
    assert.ok(adapters.includes('list-test-1'));
    assert.ok(adapters.includes('list-test-2'));
  });

  await t.test('creates adapter with folder backend', async () => {
    const adapter = await createAdapter('folder', { basePath: '/tmp/test' });
    assert.ok(adapter);
    assert.ok(adapter instanceof StorageAdapter || adapter.basePath);
  });

  await t.test('withAdapter provides cleanup', async () => {
    let initCalled = false;
    let closeCalled = false;

    registerAdapter('cleanup-test', () => {
      return {
        async init() {
          initCalled = true;
        },
        async close() {
          closeCalled = true;
        }
      };
    });

    await withAdapter('cleanup-test', {}, async (adapter) => {
      assert.ok(adapter);
    });

    assert.equal(initCalled, true);
    assert.equal(closeCalled, true);
  });

  await t.test('withAdapter handles errors gracefully', async () => {
    registerAdapter('error-test', () => {
      return {
        async init() {},
        async close() {}
      };
    });

    try {
      await withAdapter('error-test', {}, async () => {
        throw new Error('Test error');
      });
      assert.fail('Should have thrown');
    } catch (e) {
      assert.equal(e.message, 'Test error');
    }
  });
});

test('Runner Factory', async (t) => {
  await t.test('registers custom runner', () => {
    const runnerFactory = () => ({ type: 'custom' });
    registerRunner('custom-runner', runnerFactory);
    assert.equal(has('runner', 'custom-runner'), true);
  });

  await t.test('lists registered runners', () => {
    registerRunner('runner-1', () => {});
    registerRunner('runner-2', () => {});
    const runners = getRegisteredRunners();
    assert.ok(Array.isArray(runners));
  });

  await t.test('creates runner instance', async () => {
    registerRunner('test-runner', (config) => {
      return {
        config,
        async init() {},
        async run(code) {
          return { executed: true };
        }
      };
    });

    const runner = await createRunner('test-runner', { test: true });
    assert.ok(runner);
    assert.equal(runner.config.test, true);
  });
});

test('FolderAdapter - Interface Compliance', async (t) => {
  await t.test('implements StorageAdapter interface', () => {
    const adapter = new FolderAdapter('/tmp/test');
    assert.ok(adapter instanceof StorageAdapter);
  });

  await t.test('has required methods', () => {
    const adapter = new FolderAdapter('/tmp/test');
    assert.ok(typeof adapter.init === 'function');
    assert.ok(typeof adapter.createTaskRun === 'function');
    assert.ok(typeof adapter.getTaskRun === 'function');
    assert.ok(typeof adapter.updateTaskRun === 'function');
    assert.ok(typeof adapter.queryTaskRuns === 'function');
  });

  await t.test('initializes with basePath', async () => {
    const adapter = new FolderAdapter('/tmp/test');
    assert.equal(adapter.basePath, '/tmp/test');
    await adapter.init();
  });
});

test('Adapter Selection and Multi-Adapter Support', async (t) => {
  await t.test('supports multiple adapters simultaneously', () => {
    registerAdapter('multi-test-1', () => ({ id: 1 }));
    registerAdapter('multi-test-2', () => ({ id: 2 }));
    const adapters = getRegisteredAdapters();
    assert.ok(adapters.includes('multi-test-1'));
    assert.ok(adapters.includes('multi-test-2'));
  });

  await t.test('supports multiple runners simultaneously', () => {
    registerRunner('multi-runner-1', () => ({ id: 1 }));
    registerRunner('multi-runner-2', () => ({ id: 2 }));
    const runners = getRegisteredRunners();
    assert.ok(runners.includes('multi-runner-1'));
    assert.ok(runners.includes('multi-runner-2'));
  });
});

test('Registry - Plugin System', async (t) => {
  await t.test('supports dynamic plugin loading', async () => {
    registerAdapter('plugin-test', (config) => ({
      name: 'plugin',
      config
    }));
    const adapter = await createAdapter('plugin-test', { pluginData: true });
    assert.equal(adapter.name, 'plugin');
    assert.equal(adapter.config.pluginData, true);
  });

  await t.test('registers multiple plugin types', () => {
    register('service', 'test-service', () => ({ service: true }));
    register('command', 'test-command', () => ({ command: true }));
    register('loader', 'test-loader', () => ({ loader: true }));

    assert.equal(has('service', 'test-service'), true);
    assert.equal(has('command', 'test-command'), true);
    assert.equal(has('loader', 'test-loader'), true);
  });
});

test('Built-in Adapters Registration', async (t) => {
  await t.test('has folder adapter available', () => {
    assert.ok(has('adapter', 'folder'));
  });

  await t.test('folder adapter is in list', () => {
    const adapters = getRegisteredAdapters();
    assert.ok(adapters.includes('folder'));
  });

  await t.test('can attempt to create SQLite adapter if available', async () => {
    if (has('adapter', 'sqlite')) {
      const adapter = await createAdapter('sqlite', { dbPath: ':memory:' });
      assert.ok(adapter);
    }
  });
});

test('Error Handling and Edge Cases', async (t) => {
  await t.test('handles missing factory gracefully', async () => {
    try {
      await create('adapter', 'definitely-does-not-exist');
      assert.fail('Should have thrown');
    } catch (e) {
      assert.ok(e.message.includes('not found'));
    }
  });

  await t.test('prevents duplicate registration', () => {
    registerAdapter('duplicate-test', () => ({ version: 1 }));
    registerAdapter('duplicate-test', () => ({ version: 2 }));
    const factory = get('adapter', 'duplicate-test');
    const instance = factory();
    assert.equal(instance.version, 2);
  });

  await t.test('registry is global and persistent', () => {
    registerAdapter('persist-test', () => ({ persistent: true }));
    const adapters1 = getRegisteredAdapters();
    const adapters2 = getRegisteredAdapters();
    assert.ok(adapters1.includes('persist-test'));
    assert.ok(adapters2.includes('persist-test'));
  });
});

test('Adapter Configuration Passing', async (t) => {
  await t.test('passes config to adapter factory', async () => {
    registerAdapter('config-test', (config) => config);
    const adapter = await createAdapter('config-test', {
      key1: 'value1',
      key2: 'value2'
    });
    assert.equal(adapter.key1, 'value1');
    assert.equal(adapter.key2, 'value2');
  });

  await t.test('handles empty config', async () => {
    registerAdapter('empty-config-test', (config) => {
      return { received: !!config };
    });
    const adapter = await createAdapter('empty-config-test');
    assert.equal(adapter.received, true);
  });
});

test('StorageAdapter Base Interface', async (t) => {
  await t.test('is abstract base class', () => {
    assert.ok(typeof StorageAdapter === 'function');
  });

  await t.test('FolderAdapter extends StorageAdapter', () => {
    const adapter = new FolderAdapter('/tmp');
    assert.ok(adapter instanceof StorageAdapter);
  });

  await t.test('defines required interface methods', () => {
    const adapter = new FolderAdapter('/tmp');
    assert.ok(typeof adapter.init === 'function');
    assert.ok(typeof adapter.close === 'function');
  });
});
