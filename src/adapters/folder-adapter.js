import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { StorageAdapter } from '../interfaces/storage-adapter.js';

export class FolderAdapter extends StorageAdapter {
  constructor(basePath = './tasks') {
    super();
    this.basePath = basePath;
    this.taskRunsCache = new Map();
    this.stackRunsCache = new Map();
    this.keystoreCache = new Map();
  }

  async init() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
    this.loadCaches();
  }

  loadCaches() {
    if (fs.existsSync(this.basePath)) {
      const files = fs.readdirSync(this.basePath);
      for (const file of files) {
        if (file.endsWith('.json') && file.startsWith('task-run-')) {
          const id = file.replace('task-run-', '').replace('.json', '');
          const data = JSON.parse(fs.readFileSync(path.join(this.basePath, file), 'utf-8'));
          this.taskRunsCache.set(id, data);
        }
        if (file.endsWith('.json') && file.startsWith('stack-run-')) {
          const id = file.replace('stack-run-', '').replace('.json', '');
          const data = JSON.parse(fs.readFileSync(path.join(this.basePath, file), 'utf-8'));
          this.stackRunsCache.set(id, data);
        }
        if (file === 'keystore.json') {
          const data = JSON.parse(fs.readFileSync(path.join(this.basePath, file), 'utf-8'));
          Object.entries(data).forEach(([k, v]) => this.keystoreCache.set(k, v));
        }
      }
    }
  }

  persistKeystore() {
    const data = Object.fromEntries(this.keystoreCache);
    fs.writeFileSync(
      path.join(this.basePath, 'keystore.json'),
      JSON.stringify(data, null, 2)
    );
  }

  async createTaskRun(taskRun) {
    const id = taskRun.id || randomUUID();
    const record = {
      id,
      taskName: taskRun.taskName,
      status: taskRun.status || 'pending',
      input: taskRun.input || {},
      output: taskRun.output || null,
      error: taskRun.error || null,
      startedAt: taskRun.startedAt || new Date().toISOString(),
      completedAt: taskRun.completedAt || null
    };
    this.taskRunsCache.set(id, record);
    fs.writeFileSync(
      path.join(this.basePath, `task-run-${id}.json`),
      JSON.stringify(record, null, 2)
    );
    return record;
  }

  async getTaskRun(id) {
    return this.taskRunsCache.get(id) || null;
  }

  async updateTaskRun(id, updates) {
    const record = this.taskRunsCache.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    fs.writeFileSync(
      path.join(this.basePath, `task-run-${id}.json`),
      JSON.stringify(record, null, 2)
    );
    return record;
  }

  async queryTaskRuns(filter) {
    return Array.from(this.taskRunsCache.values()).filter(run => {
      if (filter.taskName && run.taskName !== filter.taskName) return false;
      if (filter.status && run.status !== filter.status) return false;
      return true;
    });
  }

  async createStackRun(stackRun) {
    const id = stackRun.id || randomUUID();
    const record = {
      id,
      task_run_id: stackRun.task_run_id,
      parent_stack_run_id: stackRun.parent_stack_run_id || null,
      operation: stackRun.operation || null,
      status: stackRun.status || 'pending',
      input: stackRun.input || {},
      output: stackRun.output || null,
      error: stackRun.error || null,
      createdAt: stackRun.createdAt || new Date().toISOString()
    };
    this.stackRunsCache.set(id, record);
    fs.writeFileSync(
      path.join(this.basePath, `stack-run-${id}.json`),
      JSON.stringify(record, null, 2)
    );
    return record;
  }

  async getStackRun(id) {
    return this.stackRunsCache.get(id) || null;
  }

  async updateStackRun(id, updates) {
    const record = this.stackRunsCache.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    fs.writeFileSync(
      path.join(this.basePath, `stack-run-${id}.json`),
      JSON.stringify(record, null, 2)
    );
    return record;
  }

  async queryStackRuns(filter) {
    return Array.from(this.stackRunsCache.values()).filter(run => {
      if (filter.task_run_id && run.task_run_id !== filter.task_run_id) return false;
      if (filter.status && run.status !== filter.status) return false;
      return true;
    });
  }

  async getPendingStackRuns() {
    return Array.from(this.stackRunsCache.values()).filter(run => run.status === 'pending');
  }

  async storeTaskFunction(taskFunction) {
    const id = taskFunction.id || randomUUID();
    const funcDir = path.join(this.basePath, 'functions', id);
    if (!fs.existsSync(funcDir)) {
      fs.mkdirSync(funcDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(funcDir, 'metadata.json'),
      JSON.stringify({ id, name: taskFunction.name, createdAt: new Date().toISOString() }, null, 2)
    );
    if (taskFunction.code) {
      fs.writeFileSync(path.join(funcDir, 'code.js'), taskFunction.code);
    }
    return { id, name: taskFunction.name };
  }

  async getTaskFunction(identifier) {
    const funcDir = path.join(this.basePath, 'functions', identifier);
    if (!fs.existsSync(funcDir)) return null;
    const code = fs.readFileSync(path.join(funcDir, 'code.js'), 'utf-8');
    const metadata = JSON.parse(fs.readFileSync(path.join(funcDir, 'metadata.json'), 'utf-8'));
    return { ...metadata, code };
  }

  async setKeystore(key, value) {
    this.keystoreCache.set(key, value);
    this.persistKeystore();
  }

  async getKeystore(key) {
    return this.keystoreCache.get(key) || null;
  }

  async deleteKeystore(key) {
    this.keystoreCache.delete(key);
    this.persistKeystore();
  }

  async close() {
  }
}

export default FolderAdapter;
