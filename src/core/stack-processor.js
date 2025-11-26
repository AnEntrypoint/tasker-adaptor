import ServiceClient from './service-client.js';
import logger from 'sequential-logging';

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

      logger.info('Processing stack run', { stackRunId: stackRun.id, operation: stackRun.operation });

      await this.storage.updateStackRun(stackRun.id, {
        status: 'in_progress'
      });

      const input = stackRun.input;
      const { serviceName, methodPath, args } = input;

      let result = null;
      let error = null;

      try {
        logger.info('Calling service', { serviceName, methodPath });
        result = await this.serviceClient.call(serviceName, methodPath, args);
        logger.info('Service call completed', { serviceName, methodPath });
      } catch (e) {
        error = e;
        logger.error('Service call failed', e, { serviceName, methodPath });
      }

      if (error) {
        logger.info('Marking stack run as failed', { stackRunId: stackRun.id });
        await this.storage.updateStackRun(stackRun.id, {
          status: 'failed',
          error: JSON.stringify({ message: error.message, stack: error.stack })
        });
      } else {
        logger.info('Marking stack run as completed', { stackRunId: stackRun.id });
        await this.storage.updateStackRun(stackRun.id, {
          status: 'completed',
          result: JSON.stringify(result)
        });
      }

      if (stackRun.parent_stack_run_id) {
        logger.info('Stack run has parent, resuming parent task', { stackRunId: stackRun.id, parentStackRunId: stackRun.parent_stack_run_id });
        await this._resumeParentTask(stackRun, error);
      } else {
        logger.info('Stack run has no parent', { stackRunId: stackRun.id });
      }
    } catch (error) {
      logger.error('Error processing stack run', error, { stackRunId: stackRun.id });
      await this.storage.updateStackRun(stackRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message, stack: error.stack })
      });
    }
  }

  async _resumeParentTask(childStackRun, error) {
    logger.info('_resumeParentTask called for child stack run', { childStackRunId: childStackRun.id });

    const parentStackRun = await this.storage.getStackRun(childStackRun.parent_stack_run_id);
    if (!parentStackRun) {
      logger.info('Parent stack run not found', { parentStackRunId: childStackRun.parent_stack_run_id });
      return;
    }

    const taskRun = await this.storage.getTaskRun(childStackRun.task_run_id);
    if (!taskRun) {
      logger.info('Task run not found', { taskRunId: childStackRun.task_run_id });
      return;
    }

    let resumePayload = null;

    if (error) {
      resumePayload = { error: { message: error.message } };
      logger.info('Resuming with error', { errorMessage: error.message });
    } else {
      // Re-fetch the stack run from database to get updated result field
      const freshChildStackRun = await this.storage.getStackRun(childStackRun.id);
      resumePayload = freshChildStackRun.result ? (typeof freshChildStackRun.result === 'string' ? JSON.parse(freshChildStackRun.result) : freshChildStackRun.result) : null;
      logger.info('Resuming with result', { childStackRunId: childStackRun.id });
    }

    await this.storage.updateStackRun(parentStackRun.id, {
      status: 'suspended_waiting_child',
      resume_payload: JSON.stringify(resumePayload)
    });

    const taskFunction = await this.storage.getTaskFunction(taskRun.task_identifier);
    if (!taskFunction) {
      logger.info('Task function not found', { taskIdentifier: taskRun.task_identifier });
      return;
    }

    logger.info('Calling executor.resume for task', { taskRunId: taskRun.id });
    const { TaskExecutor } = await import('./task-executor.js');
    const executor = new TaskExecutor(this.storage, this.serviceClient);

    try {
      await executor.resume(taskRun, resumePayload, taskFunction.code, parentStackRun.id);
      logger.info('Task resumed successfully', { taskRunId: taskRun.id });
    } catch (e) {
      logger.error('Error resuming task', e, { taskRunId: taskRun.id });
      throw e;
    }
  }
}

export default StackProcessor;
