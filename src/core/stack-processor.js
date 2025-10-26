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

      console.log(`[StackProcessor] Processing stack run ${stackRun.id}: ${stackRun.operation}`);

      await this.storage.updateStackRun(stackRun.id, {
        status: 'in_progress'
      });

      const input = stackRun.input;
      const { serviceName, methodPath, args } = input;

      let result = null;
      let error = null;

      try {
        console.log(`[StackProcessor] Calling service: ${serviceName}.${methodPath}`);
        result = await this.serviceClient.call(serviceName, methodPath, args);
        console.log(`[StackProcessor] Service call completed`);
      } catch (e) {
        error = e;
        console.error(`[StackProcessor] Service call failed:`, e.message);
      }

      if (error) {
        console.log(`[StackProcessor] Marking stack run as failed`);
        await this.storage.updateStackRun(stackRun.id, {
          status: 'failed',
          error: JSON.stringify({ message: error.message, stack: error.stack })
        });
      } else {
        console.log(`[StackProcessor] Marking stack run as completed`);
        await this.storage.updateStackRun(stackRun.id, {
          status: 'completed',
          result: JSON.stringify(result)
        });
      }

      if (stackRun.parent_stack_run_id) {
        console.log(`[StackProcessor] Stack run has parent, resuming parent task`);
        await this._resumeParentTask(stackRun, error);
      } else {
        console.log(`[StackProcessor] Stack run has no parent`);
      }
    } catch (error) {
      console.error(`[StackProcessor] Error processing stack run:`, error.message);
      await this.storage.updateStackRun(stackRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message, stack: error.stack })
      });
    }
  }

  async _resumeParentTask(childStackRun, error) {
    console.log(`[StackProcessor] _resumeParentTask called for child stack run ${childStackRun.id}`);

    const parentStackRun = await this.storage.getStackRun(childStackRun.parent_stack_run_id);
    if (!parentStackRun) {
      console.log(`[StackProcessor] Parent stack run not found`);
      return;
    }

    const taskRun = await this.storage.getTaskRun(childStackRun.task_run_id);
    if (!taskRun) {
      console.log(`[StackProcessor] Task run not found`);
      return;
    }

    let resumePayload = null;

    if (error) {
      resumePayload = { error: { message: error.message } };
      console.log(`[StackProcessor] Resuming with error: ${error.message}`);
    } else {
      // Re-fetch the stack run from database to get updated result field
      const freshChildStackRun = await this.storage.getStackRun(childStackRun.id);
      resumePayload = freshChildStackRun.result ? (typeof freshChildStackRun.result === 'string' ? JSON.parse(freshChildStackRun.result) : freshChildStackRun.result) : null;
      console.log(`[StackProcessor] Resuming with result`);
    }

    await this.storage.updateStackRun(parentStackRun.id, {
      status: 'suspended_waiting_child',
      resume_payload: JSON.stringify(resumePayload)
    });

    const taskFunction = await this.storage.getTaskFunction(taskRun.task_identifier);
    if (!taskFunction) {
      console.log(`[StackProcessor] Task function not found`);
      return;
    }

    console.log(`[StackProcessor] Calling executor.resume for task ${taskRun.id}`);
    const { TaskExecutor } = await import('./task-executor.js');
    const executor = new TaskExecutor(this.storage, this.serviceClient);

    try {
      await executor.resume(taskRun, resumePayload, taskFunction.code, parentStackRun.id);
      console.log(`[StackProcessor] Task resumed successfully`);
    } catch (e) {
      console.error(`[StackProcessor] Error resuming task:`, e.message);
      throw e;
    }
  }
}

export default StackProcessor;
