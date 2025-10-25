import ServiceClient from './service-client.js';

/**
 * Stack processor for handling pending stack runs
 * Processes service calls created by suspended tasks
 */
export class StackProcessor {
  constructor(storage, serviceClient) {
    this.storage = storage;
    this.serviceClient = serviceClient || new ServiceClient();
  }

  /**
   * Process all pending stack runs
   * @returns {Promise<void>}
   */
  async processPending() {
    const pending = await this.storage.getPendingStackRuns();

    for (const stackRun of pending) {
      await this.processStackRun(stackRun);
    }
  }

  /**
   * Process a specific stack run
   * @param {Object} stackRun - Stack run to process
   * @returns {Promise<void>}
   */
  async processStackRun(stackRun) {
    try {
      if (stackRun.status === 'in_progress') {
        return;
      }

      await this.storage.updateStackRun(stackRun.id, {
        status: 'in_progress'
      });

      const input = stackRun.input;
      const { serviceName, methodPath, args } = input;

      const result = await this.serviceClient.call(serviceName, methodPath, args);

      await this.storage.updateStackRun(stackRun.id, {
        status: 'completed',
        result: JSON.stringify(result)
      });

      if (stackRun.parent_stack_run_id) {
        await this._resumeParentTask(stackRun);
      }
    } catch (error) {
      await this.storage.updateStackRun(stackRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message, stack: error.stack })
      });
    }
  }

  async _resumeParentTask(childStackRun) {
    const parentStackRun = await this.storage.getStackRun(childStackRun.parent_stack_run_id);
    if (!parentStackRun) return;

    const taskRun = await this.storage.getTaskRun(childStackRun.task_run_id);
    if (!taskRun) return;

    await this.storage.updateStackRun(parentStackRun.id, {
      status: 'suspended_waiting_child',
      resume_payload: JSON.stringify({
        result: childStackRun.result
      })
    });

    const taskFunction = await this.storage.getTaskFunction(taskRun.task_identifier);
    if (!taskFunction) return;

    const resumePayload = childStackRun.result ? JSON.parse(childStackRun.result) : null;

    const { TaskExecutor } = await import('./task-executor.js');
    const executor = new TaskExecutor(this.storage, this.serviceClient);

    await executor.resume(taskRun, resumePayload, taskFunction.code);
  }
}

export default StackProcessor;
