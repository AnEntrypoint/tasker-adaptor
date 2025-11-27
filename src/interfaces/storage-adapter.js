export class StorageAdapter {
  async init() { throw new Error('init() not implemented'); }
  async createTaskRun(_taskRun) { throw new Error('createTaskRun() not implemented'); }
  async getTaskRun(_id) { throw new Error('getTaskRun() not implemented'); }
  async updateTaskRun(_id, _updates) { throw new Error('updateTaskRun() not implemented'); }
  async queryTaskRuns(_filter) { throw new Error('queryTaskRuns() not implemented'); }
  async createStackRun(_stackRun) { throw new Error('createStackRun() not implemented'); }
  async getStackRun(_id) { throw new Error('getStackRun() not implemented'); }
  async updateStackRun(_id, _updates) { throw new Error('updateStackRun() not implemented'); }
  async queryStackRuns(_filter) { throw new Error('queryStackRuns() not implemented'); }
  async getPendingStackRuns() { throw new Error('getPendingStackRuns() not implemented'); }
  async storeTaskFunction(_taskFunction) { throw new Error('storeTaskFunction() not implemented'); }
  async getTaskFunction(_identifier) { throw new Error('getTaskFunction() not implemented'); }
  async setKeystore(_key, _value) { throw new Error('setKeystore() not implemented'); }
  async getKeystore(_key) { throw new Error('getKeystore() not implemented'); }
  async deleteKeystore(_key) { throw new Error('deleteKeystore() not implemented'); }
  async close() { throw new Error('close() not implemented'); }
}

export default StorageAdapter;
