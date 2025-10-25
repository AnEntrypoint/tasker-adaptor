/**
 * Abstract storage adapter interface
 * All storage implementations must conform to this interface
 */

export class StorageAdapter {
  /**
   * Initialize the storage adapter
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('init() not implemented');
  }

  /**
   * Create a task run
   * @param {Object} taskRun - Task run data
   * @returns {Promise<Object>} Created task run with ID
   */
  async createTaskRun(taskRun) {
    throw new Error('createTaskRun() not implemented');
  }

  /**
   * Get a task run by ID
   * @param {string|number} id - Task run ID
   * @returns {Promise<Object>} Task run data or null
   */
  async getTaskRun(id) {
    throw new Error('getTaskRun() not implemented');
  }

  /**
   * Update a task run
   * @param {string|number} id - Task run ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated task run
   */
  async updateTaskRun(id, updates) {
    throw new Error('updateTaskRun() not implemented');
  }

  /**
   * Query task runs
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of task runs
   */
  async queryTaskRuns(filter) {
    throw new Error('queryTaskRuns() not implemented');
  }

  /**
   * Create a stack run
   * @param {Object} stackRun - Stack run data
   * @returns {Promise<Object>} Created stack run with ID
   */
  async createStackRun(stackRun) {
    throw new Error('createStackRun() not implemented');
  }

  /**
   * Get a stack run by ID
   * @param {string|number} id - Stack run ID
   * @returns {Promise<Object>} Stack run data or null
   */
  async getStackRun(id) {
    throw new Error('getStackRun() not implemented');
  }

  /**
   * Update a stack run
   * @param {string|number} id - Stack run ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated stack run
   */
  async updateStackRun(id, updates) {
    throw new Error('updateStackRun() not implemented');
  }

  /**
   * Query stack runs
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} Array of stack runs
   */
  async queryStackRuns(filter) {
    throw new Error('queryStackRuns() not implemented');
  }

  /**
   * Get pending stack runs (for processing)
   * @returns {Promise<Array>} Array of pending stack runs
   */
  async getPendingStackRuns() {
    throw new Error('getPendingStackRuns() not implemented');
  }

  /**
   * Store task function code
   * @param {Object} taskFunction - Task function metadata and code
   * @returns {Promise<Object>} Stored task function
   */
  async storeTaskFunction(taskFunction) {
    throw new Error('storeTaskFunction() not implemented');
  }

  /**
   * Get task function by identifier
   * @param {string} identifier - Task function identifier
   * @returns {Promise<Object>} Task function or null
   */
  async getTaskFunction(identifier) {
    throw new Error('getTaskFunction() not implemented');
  }

  /**
   * Store key-value pair (for credentials, config, etc)
   * @param {string} key - Key
   * @param {any} value - Value
   * @returns {Promise<void>}
   */
  async setKeystore(key, value) {
    throw new Error('setKeystore() not implemented');
  }

  /**
   * Get key-value pair
   * @param {string} key - Key
   * @returns {Promise<any>} Value or null
   */
  async getKeystore(key) {
    throw new Error('getKeystore() not implemented');
  }

  /**
   * Delete key-value pair
   * @param {string} key - Key
   * @returns {Promise<void>}
   */
  async deleteKeystore(key) {
    throw new Error('deleteKeystore() not implemented');
  }

  /**
   * Close storage connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('close() not implemented');
  }
}

export default StorageAdapter;
