import { register, list, create } from './core/registry.js';

let initialized = false;

async function registerBuiltInRunners() {
  if (initialized) return;
  initialized = true;

  try {
    const { SequentialFetchVM } = await import('sequential-fetch');
    register('runner', 'fetch', (config) => ({
      vm: new SequentialFetchVM(config),
      async init() { await this.vm.initialize?.(); },
      async run(code) { return this.vm.executeCode(code); },
      async resume(fetchId, response) { return this.vm.resumeExecution(fetchId, response); },
      async status() { return { paused: !!this.vm.paused, state: this.vm.paused }; },
      async dispose() { this.vm.dispose(); }
    }));
  } catch {}

  try {
    const flowModule = await import('sequential-flow');
    register('runner', 'flow', (config) => ({
      flow: flowModule,
      config,
      async init() {},
      async run(code, input) { return this.flow.execute(code, input, this.config); },
      async resume(state, response) { return this.flow.resume(state, response); },
      async status() { return { type: 'flow' }; },
      async dispose() {}
    }));
  } catch {}

  try {
    const { StateKit } = await import('containerbuilder');
    register('runner', 'container', (config) => ({
      kit: new StateKit(config),
      async init() {},
      async run(instruction) { return this.kit.run(instruction); },
      async resume() { return this.kit.rebuild(); },
      async status() { return this.kit.status(); },
      async dispose() { await this.kit.reset(); }
    }));
  } catch {}
}

export function registerRunner(name, factory) {
  register('runner', name, factory);
}

export function getRegisteredRunners() {
  return list('runner');
}

export async function createRunner(type, config = {}) {
  await registerBuiltInRunners();
  return create('runner', type, config);
}
