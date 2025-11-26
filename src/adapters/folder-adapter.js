import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { StorageAdapter } from '../interfaces/storage-adapter.js';
import { CRUDPatterns, Serializer } from 'sequential-storage-utils';
import { nowISO } from 'sequential-utils/timestamps';

export class FolderAdapter extends StorageAdapter {
  constructor(basePath = './tasks') {
    super();
    this.basePath = basePath;
    this.taskRunsCache = new Map();
    this.stackRunsCache = new Map();
    this.keystoreCache = new Map();
    this.crud = new CRUDPatterns();
    this.serializer = new Serializer();
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
    const record = this.crud.buildTaskRunCreate({ id, ...taskRun });
    const normalized = this.crud.normalizeTaskRunRecord(record);
    this.taskRunsCache.set(id, normalized);
    fs.writeFileSync(
      path.join(this.basePath, `task-run-${id}.json`),
      JSON.stringify(normalized, null, 2)
    );
    return normalized;
  }

  async getTaskRun(id) {
    const cached = this.taskRunsCache.get(id);
    return cached ? this.crud.normalizeTaskRunRecord(cached) : null;
  }

  async updateTaskRun(id, updates) {
    const record = this.taskRunsCache.get(id);
    if (!record) return null;
    const prepared = this.crud.buildTaskRunUpdate(updates);
    const merged = this.crud.mergeUpdates(record, prepared);
    const normalized = this.crud.normalizeTaskRunRecord(merged);
    this.taskRunsCache.set(id, normalized);
    fs.writeFileSync(
      path.join(this.basePath, `task-run-${id}.json`),
      JSON.stringify(normalized, null, 2)
    );
    return normalized;
  }

  async queryTaskRuns(filter) {
    const records = Array.from(this.taskRunsCache.values());
    const query = this.crud.buildTaskRunQuery(filter);
    const filtered = this.crud.filterRecords(records, query);
    return filtered.map(r => this.crud.normalizeTaskRunRecord(r));
  }

  async createStackRun(stackRun) {
    const id = stackRun.id || randomUUID();
    const record = this.crud.buildStackRunCreate({ id, ...stackRun });
    const normalized = this.crud.normalizeStackRunRecord(record);
    this.stackRunsCache.set(id, normalized);
    fs.writeFileSync(
      path.join(this.basePath, `stack-run-${id}.json`),
      JSON.stringify(normalized, null, 2)
    );
    return normalized;
  }

  async getStackRun(id) {
    const cached = this.stackRunsCache.get(id);
    return cached ? this.crud.normalizeStackRunRecord(cached) : null;
  }

  async updateStackRun(id, updates) {
    const record = this.stackRunsCache.get(id);
    if (!record) return null;
    const prepared = this.crud.buildStackRunUpdate(updates);
    const merged = this.crud.mergeUpdates(record, prepared);
    const normalized = this.crud.normalizeStackRunRecord(merged);
    this.stackRunsCache.set(id, normalized);
    fs.writeFileSync(
      path.join(this.basePath, `stack-run-${id}.json`),
      JSON.stringify(normalized, null, 2)
    );
    return normalized;
  }

  async queryStackRuns(filter) {
    const records = Array.from(this.stackRunsCache.values());
    const query = this.crud.buildStackRunQuery(filter);
    const filtered = this.crud.filterRecords(records, query);
    return filtered.map(r => this.crud.normalizeStackRunRecord(r));
  }

  async getPendingStackRuns() {
    const records = Array.from(this.stackRunsCache.values());
    return records.filter(run => run.status === 'pending').map(r => this.crud.normalizeStackRunRecord(r));
  }

  async storeTaskFunction(taskFunction) {
    const id = taskFunction.id || randomUUID();
    const funcDir = path.join(this.basePath, 'functions', id);
    if (!fs.existsSync(funcDir)) {
      fs.mkdirSync(funcDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(funcDir, 'metadata.json'),
      JSON.stringify({ id, name: taskFunction.name, createdAt: nowISO() }, null, 2)
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
