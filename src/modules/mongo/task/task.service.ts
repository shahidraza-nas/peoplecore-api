import {
  ModelService,
  ModelWrap,
  MongoCreateResponse,
  MongoDeleteResponse,
  MongoJob,
  MongoService,
  MongoUpdateResponse,
} from '@core/mongo';
import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Task, TaskStatus } from './entities/task.entity';

@Injectable()
export class TaskService extends ModelService<Task> {
  private logger: Logger = new Logger('TaskSchedule');

  constructor(
    protected db: MongoService<Task>,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    super(db);
  }

  /**
   * doAfterCreate
   * @function function will execute before create and update function
   * @param {object} job - mandatory - a job object representing the job information
   * @return {void}
   */
  async doAfterCreate(
    job: MongoJob<Task>,
    response: MongoCreateResponse<Task>,
  ): Promise<void> {
    await super.doAfterCreate(job, response);
    this.createCron(response.data);
  }

  /**
   * doAfterUpdate
   * @function function will execute before create and update function
   * @param {object} job - mandatory - a job object representing the job information
   * @return {void}
   */
  async doAfterUpdate(
    job: MongoJob<Task>,
    response: MongoUpdateResponse<Task>,
  ): Promise<void> {
    await super.doAfterUpdate(job, response);
    this.schedulerRegistry.deleteCronJob(`${job.id}`);
    this.logger.warn(`Task deleted`);
    this.createCron(response.data);
  }

  /**
   * doAfterDelete
   * @function function will execute before create and update function
   * @param {object} job - mandatory - a job object representing the job information
   * @return {void}
   */
  async doAfterDelete(
    job: MongoJob<Task>,
    response: MongoDeleteResponse<Task>,
  ): Promise<void> {
    await super.doAfterDelete(job, response);
    this.schedulerRegistry.deleteCronJob(`${job.id}`);
    this.logger.warn(`Task deleted`);
  }

  async initCrons(): Promise<void> {
    this.logger.log('Fetching schedules');
    const { error, data } = await this.db.getAllRecords({
      options: {
        where: {
          status: TaskStatus.Pending,
        },
        limit: -1,
        pagination: false,
      },
    });

    if (error) {
      this.logger.error('Error! Unable to fetch schedules!');
      return;
    }

    if (!data.length) {
      this.logger.log('No schedules found!');
      return;
    }

    this.logger.log('Scheduling tasks');

    for (let index = 0; index < data.length; index++) {
      const task = data[index];
      this.createCron(task);
    }

    this.logger.log('Task scheduled');
  }

  createCron(task: ModelWrap<Task>) {
    switch (task.name) {
      // Sample cron category
      case 'test':
        break;

      default:
        break;
    }
  }

  async markAsCompleted(task: ModelWrap<Task>) {
    try {
      task.error = false;
      task.status = TaskStatus.Completed;
      await task.save();
      this.logger.log('Task completed');
    } catch (error) {
      console.error('Error marking task as completed:', error);
    }
  }

  async markAsErrored(task: ModelWrap<Task>, error: any) {
    try {
      task.error = error;
      task.status = TaskStatus.Errored;
      await task.save();
      this.logger.log('Task failed!');
    } catch (error) {
      console.error('Error marking task as errored:', error);
    }
  }
}
