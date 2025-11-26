import ServiceClient from './service-client.js';
import logger from 'sequential-logging';

/**
 * Task executor that runs task code with automatic suspend/resume
 */
export class TaskExecutor {
  constructor(storage, serviceClient) {
    this.storage = storage;
    this.serviceClient = serviceClient || new ServiceClient();
  }

  /**
   * Execute a task
   * @param {Object} taskRun - Task run record
   * @param {string} taskCode - Task code to execute
   * @returns {Promise<Object>} Execution result
   */
  async execute(taskRun, taskCode) {
    try {
      const stackRun = await this.storage.createStackRun({
        task_run_id: taskRun.id,
        operation: 'task_init',
        status: 'in_progress',
        input: taskRun.input
      });

      const context = {
        taskRun,
        stackRun,
        storage: this.storage,
        serviceClient: this.serviceClient,
        suspended: false,
        suspensionData: null
      };

      let result;
      try {
        result = await this._executeCode(taskCode, context);
      } catch (error) {
        if (error.message === 'TASK_SUSPENDED') {
          return {
            suspended: true,
            suspensionData: context.suspensionData
          };
        }
        throw error;
      }

      await this.storage.updateTaskRun(taskRun.id, {
        status: 'completed',
        result: JSON.stringify(result)
      });

      return { success: true, result };
    } catch (error) {
      await this.storage.updateTaskRun(taskRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message, stack: error.stack })
      });

      throw error;
    }
  }

  /**
   * Resume a suspended task with results from child call
   * @param {Object} taskRun - Task run record
   * @param {Object} resumePayload - Results from child call
   * @param {string} taskCode - Task code to resume
   * @param {number} parentStackRunId - Parent stack run ID for new service calls
   * @returns {Promise<Object>} Execution result
   */
  async resume(taskRun, resumePayload, taskCode, parentStackRunId) {
    try {
      logger.info('Resuming task', { taskRunId: taskRun.id });

      const context = {
        taskRun,
        storage: this.storage,
        serviceClient: this.serviceClient,
        suspended: false,
        suspensionData: null,
        resumePayload,
        parentStackRunId
      };

      let result;
      try {
        logger.info('Executing code with resumePayload', { taskRunId: taskRun.id });
        result = await this._executeCode(taskCode, context, resumePayload);
        logger.info('Code execution completed', { taskRunId: taskRun.id });
      } catch (error) {
        if (error.message === 'TASK_SUSPENDED') {
          logger.info('Task suspended again', { taskRunId: taskRun.id });
          return {
            suspended: true,
            suspensionData: context.suspensionData
          };
        }
        throw error;
      }

      logger.info('Updating task as completed', { taskRunId: taskRun.id });
      await this.storage.updateTaskRun(taskRun.id, {
        status: 'completed',
        result: JSON.stringify(result)
      });
      logger.info('Task update completed', { taskRunId: taskRun.id });

      return { success: true, result };
    } catch (error) {
      logger.error('Error resuming task', error, { taskRunId: taskRun.id });
      await this.storage.updateTaskRun(taskRun.id, {
        status: 'failed',
        error: JSON.stringify({ message: error.message })
      });

      throw error;
    }
  }

  async _executeCode(code, context, resumePayload) {
    const __callHostTool__ = async (serviceName, methodPath, args) => {
      const childStackRun = await context.storage.createStackRun({
        task_run_id: context.taskRun.id,
        parent_stack_run_id: context.stackRun?.id || context.parentStackRunId,
        operation: `${serviceName}.${methodPath}`,
        status: 'pending',
        input: { serviceName, methodPath, args }
      });

      context.suspensionData = {
        taskRunId: context.taskRun.id,
        childStackRunId: childStackRun.id,
        serviceName,
        methodPath,
        args
      };

      throw new Error('TASK_SUSPENDED');
    };

    const AsyncFunction = (async function() {}).constructor;
    const func = new AsyncFunction('__callHostTool__', 'resumePayload', code);
    return await func(__callHostTool__, resumePayload);
  }
}

export default TaskExecutor;
