import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Model, ModelStatic } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { NotFoundError } from 'src/core/core.errors';
import { addDays } from 'src/core/core.utils';
import { History } from 'src/modules/mongo/history/entities/history.entity';
import { Trash } from 'src/modules/mongo/trash/entities/trash.entity';
import {
  SqlCountResponse,
  SqlCreateBulkResponse,
  SqlCreateResponse,
  SqlDeleteResponse,
  SqlGetAllResponse,
  SqlGetOneResponse,
  SqlJob,
  SqlResponse,
  SqlUpdateResponse,
  WrapSqlJob,
} from './sql.job';
import { SqlModel } from './sql.model';
import { SqlOption } from './sql.module';
import { getScopes } from './sql.utils';

export type ModelWrap<T extends SqlModel> = Model<T, T>;

@Injectable()
export class SqlService<M extends SqlModel> {
  private readonly model: ModelStatic<M>;

  constructor(
    @Inject('MODEL_NAME') modelName: string,
    @Inject('MODEL_OPTIONS') private options: SqlOption,
    sequelize: Sequelize,
    @InjectConnection() private connection: Connection,
    private _config: ConfigService,
  ) {
    this.model = sequelize.models[modelName] as ModelStatic<M>;
  }

  private addToHistory(history: Partial<History>) {
    this.connection.models.History.create({
      entity: this.model.name,
      expire_in: this.options.historyExpireIn
        ? addDays(this.options.historyExpireIn)
        : null,
      ...history,
    }).catch((err) => {
      // log error but don't block main process
      console.error('Error creating history record', err);
    });
  }

  private addToTrash(trash: Partial<Trash>) {
    this.connection.models.Trash.create({
      entity: this.model.name,
      expire_in: this.options.trashExpireIn
        ? addDays(this.options.trashExpireIn)
        : null,
      ...trash,
    }).catch((err) => {
      // log error but don't block main process
      console.error('Error creating trash record', err);
    });
  }

  /**
   * Create a new record using model's create method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async createRecord(job: SqlJob<M>): Promise<SqlCreateResponse<M>> {
    try {
      const { body, owner, options } = job;
      if (typeof body === 'undefined')
        return {
          error: 'Error calling createRecord - body is missing',
        };
      const { include, attributes } = options;
      const data = this.model.build(body, {
        include,
      });
      if (owner && owner.id) {
        data.setDataValue('created_by', owner.id);
        data.setDataValue('updated_by', owner.id);
      }
      await data.save(options);

      if (this.options.history) {
        this.addToHistory({
          entity_id: data.getDataValue('id'),
          action: 'create',
          created: true,
          data: data.toJSON(),
          created_by: owner.id,
        });
      }

      if (include || attributes) {
        const dataWithInclude = await this.model.findByPk(
          data.getDataValue('id'),
          {
            include,
            attributes,
          },
        );
        return { data: dataWithInclude };
      }
      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Create bulk records using model's bulkCreate method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async createBulkRecords(job: SqlJob<M>): Promise<SqlCreateBulkResponse<M>> {
    try {
      const { records, owner, options } = job;
      if (!records.length)
        return {
          error: 'Error calling createBulkRecord - records are missing',
        };

      const data = await this.model.bulkCreate(
        records.map((record) => ({
          ...record,
          created_by: owner && owner.id ? owner.id : undefined,
          updated_by: owner && owner.id ? owner.id : undefined,
        })),
        options,
      );

      if (this.options.history) {
        data.forEach((item) => {
          this.addToHistory({
            entity_id: item.getDataValue('id'),
            action: 'create',
            created: true,
            data: item.toJSON(),
            created_by: owner.id,
          });
        });
      }

      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Update a record using model's findByPk and save methods
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async updateRecord(job: SqlJob<M>): Promise<SqlUpdateResponse<M>> {
    try {
      const { id, body, owner, pk, options } = job;
      if (!id) return { error: 'Error calling updateRecord - id is missing' };
      if (typeof body === 'undefined')
        return {
          error: 'Error calling updateRecord - body is missing',
        };
      const { where = {}, include, attributes } = options;
      const data = await this.model.findOne({
        ...options,
        where: { ...where, [pk]: job.id },
      });
      if (data === null) throw new NotFoundError('Record not found');
      const previousData = data.toJSON();
      for (const prop in body) {
        data.setDataValue(prop, body[prop]);
      }
      if (owner && owner.id) {
        data.setDataValue('updated_by', owner.id);
      }
      await data.save(options);

      if (this.options.history) {
        this.addToHistory({
          entity_id: data.getDataValue('id'),
          action: 'update',
          data: data.toJSON(),
          previous_data: previousData,
          created_by: owner.id,
        });
      }

      if (include || attributes) {
        const dataWithInclude = await this.model.findByPk(
          data.getDataValue('id'),
          {
            include,
            attributes,
          },
        );
        return { data: dataWithInclude, previousData };
      }
      return { data, previousData };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Update bulk records using model's update methods
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async updateBulkRecords(job: SqlJob<M>): Promise<SqlResponse<[number]>> {
    try {
      const { body, owner, options } = job;
      if (typeof body === 'undefined')
        return {
          error: 'Error calling updateBulkRecords - body is missing',
        };
      if (typeof options.where === 'undefined')
        return {
          error: 'Error calling updateBulkRecords - options.where is missing',
        };

      const { where = {} } = options;
      const data = await this.model.update(
        { ...body, updated_by: owner && owner.id ? owner.id : undefined },
        {
          ...options,
          where,
        },
      );

      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Find and update a record using model's findOne and save methods
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async findAndUpdateRecord(job: SqlJob<M>): Promise<SqlUpdateResponse<M>> {
    try {
      const { body, owner, options } = job;
      if (typeof body === 'undefined')
        return {
          error: 'Error calling findAndUpdateRecord - body is missing',
        };
      if (typeof options.where === 'undefined')
        return {
          error: 'Error calling findAndUpdateRecord - options.where is missing',
        };
      const data = await this.model.findOne(options);
      if (data === null) throw new NotFoundError('Record not found');
      const previousData = data.toJSON();
      for (const prop in body) {
        data.setDataValue(prop, body[prop]);
      }
      if (owner && owner.id) {
        data.setDataValue('updated_by', owner.id);
      }
      await data.save(options);

      if (this.options.history) {
        this.addToHistory({
          entity_id: data.getDataValue('id'),
          action: 'update',
          data: data.toJSON(),
          previous_data: previousData,
          created_by: owner.id,
        });
      }

      return { data, previousData };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Get paginated results using model's findAndCountAll method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async getAllRecords(job: SqlJob<M>): Promise<SqlGetAllResponse<M>> {
    try {
      const { options } = job;
      options.limit = options.limit
        ? +options.limit === -1
          ? this._config.get('paginationMaxLimit')
          : +options.limit
        : this._config.get('paginationLimit');
      const {
        offset,
        limit,
        scope = [],
        unscoped = false,
        pagination = false,
      } = options;
      const scopedModel = unscoped
        ? this.model.unscoped()
        : scope.length > 0
          ? this.model.scope(getScopes(scope, job))
          : this.model;
      if (pagination) {
        const data = await scopedModel.findAndCountAll(options);
        return { data: data.rows, offset, limit, count: data.count };
      } else {
        const data = await scopedModel.findAll(options);
        return { data: data };
      }
    } catch (error) {
      return { error };
    }
  }

  /**
   * Get total count of record using model's findAndCountAll method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async countAllRecords(job: SqlJob<M>): Promise<SqlCountResponse> {
    try {
      const { scope = [], unscoped = false } = job.options;
      const scopedModel = unscoped
        ? this.model.unscoped()
        : scope.length > 0
          ? this.model.scope(getScopes(scope, job))
          : this.model;
      const data = await scopedModel.count(job.options);
      return { count: data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Find a record using model's findByPk method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async findRecordById(job: SqlJob<M>): Promise<SqlGetOneResponse<M>> {
    try {
      const { id, pk, options } = job;
      if (!id) return { error: 'Error calling findRecordById - id is missing' };
      const { where = {}, allowEmpty, scope = [], unscoped = false } = options;
      const scopedModel = unscoped
        ? this.model.unscoped()
        : scope.length > 0
          ? this.model.scope(getScopes(scope, job))
          : this.model;
      const data = await scopedModel.findOne({
        ...options,
        where: { ...where, [pk]: job.id },
      });
      if (data === null && !allowEmpty)
        throw new NotFoundError('Record not found');
      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Find a record using model's findOne method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async findOneRecord(job: SqlJob<M>): Promise<SqlGetOneResponse<M>> {
    try {
      const { options } = job;
      if (typeof options.where === 'undefined')
        return {
          error: 'Error calling findOneRecord - options.where is missing',
        };

      const { allowEmpty, scope = [], unscoped = false } = options;
      const scopedModel = unscoped
        ? this.model.unscoped()
        : scope.length > 0
          ? this.model.scope(getScopes(scope, job))
          : this.model;
      const data = await scopedModel.findOne(options);
      if (data === null && !allowEmpty)
        throw new NotFoundError('Record not found');
      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Delete a record using model's destroy method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async deleteRecord(job: SqlJob<M>): Promise<SqlDeleteResponse<M>> {
    try {
      const { id, pk, options, owner } = job;
      if (!id) return { error: 'Error calling deleteRecord - id is missing' };
      const { where = {}, force = false } = options;
      const data = await this.model.findOne({
        ...options,
        where: { ...where, [pk]: job.id },
        paranoid: !force,
      });
      if (data === null) throw new NotFoundError('Record not found');
      if (owner && owner.id) {
        data.setDataValue('updated_by', owner.id);
        data.setDataValue('deleted_by', owner.id);
      }
      await data.destroy({
        ...options,
        force,
      });
      if (job.options.force) {
        this.addToTrash({
          entity_id: data.getDataValue('id'),
          data: data.toJSON(),
          created_by: owner.id,
        });
      } else if (this.options.history) {
        this.addToHistory({
          entity_id: data.getDataValue('id'),
          action: 'delete',
          data: data.toJSON(),
          created_by: owner.id,
        });
      }
      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Find and delete a record using model's findOne and destroy methods
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async findAndDeleteRecord(job: SqlJob<M>): Promise<SqlDeleteResponse<M>> {
    try {
      const { options, owner } = job;
      if (typeof options.where === 'undefined')
        return {
          error: 'Error calling findAndDeleteRecord - options.where is missing',
        };
      const { force = false } = options;
      const data = await this.model.findOne({
        paranoid: !force,
        ...options,
      });
      if (data === null) throw new NotFoundError('Record not found');
      if (owner && owner.id) {
        data.setDataValue('updated_by', owner.id);
        data.setDataValue('deleted_by', owner.id);
      }
      await data.destroy(options);

      if (job.options.force) {
        this.addToTrash({
          entity_id: data.getDataValue('id'),
          data: data.toJSON(),
          created_by: owner.id,
        });
      } else if (this.options.history) {
        this.addToHistory({
          entity_id: data.getDataValue('id'),
          action: 'delete',
          data: data.toJSON(),
          created_by: owner.id,
        });
      }

      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Delete bulk records using model's destroy methods
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async deleteBulkRecords(job: SqlJob<M>): Promise<SqlResponse<number>> {
    try {
      const { options } = job;
      if (typeof options.where === 'undefined')
        return {
          error: 'Error calling deleteBulkRecords - options.where is missing',
        };
      const data = await this.model.destroy(options);
      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Restore a soft deleted record using model's restore method
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async restoreRecord(job: SqlJob<M>): Promise<SqlGetOneResponse<M>> {
    try {
      const { id, options, owner } = job;
      if (!id) return { error: 'Error calling restoreRecord - id is missing' };
      const data = await this.model.findByPk(id, {
        paranoid: false,
      });
      if (data === null) throw new NotFoundError('Record not found');
      if (owner && owner.id) {
        data.setDataValue('updated_by', owner.id);
        data.setDataValue('deleted_by', null);
      }

      if (this.options.history) {
        this.addToHistory({
          entity_id: data.getDataValue('id'),
          action: 'restore',
          data: data.toJSON(),
          created_by: owner.id,
        });
      }

      await data.restore(options);
      return { data };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Find a record or create if not exists
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async findOrCreate(job: SqlJob<M>): Promise<SqlCreateResponse<M>> {
    try {
      const { body, options, owner } = job;
      if (typeof body === 'undefined')
        return {
          error: 'Error calling findOrCreate - body is missing',
        };
      if (typeof options.where === 'undefined')
        return {
          error: 'Error calling findOrCreate - options.where is missing',
        };

      const [data, created] = await this.model.findOrBuild(options);

      if (created) {
        for (const prop in body) {
          data.setDataValue(prop, body[prop]);
        }
        if (owner && owner.id) {
          data.setDataValue('created_by', owner.id);
          data.setDataValue('updated_by', owner.id);
        }
        await data.save(options);

        if (this.options.history) {
          this.addToHistory({
            entity_id: data.getDataValue('id'),
            action: 'create',
            created,
            data: data.toJSON(),
            created_by: owner.id,
          });
        }

        const { include, attributes } = options;

        if (include || attributes) {
          const dataWithInclude = await this.model.findByPk(
            data.getDataValue('id'),
            {
              include,
              attributes,
            },
          );
          return { data: dataWithInclude, created };
        }

        return { data, created };
      }

      return { data, created };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Update if exists or create a new record
   * @param {object} job - mandatory - a job object representing the job information
   * @return {object} job response object
   */
  @WrapSqlJob
  async createOrUpdate(job: SqlJob<M>): Promise<SqlCreateResponse<M>> {
    try {
      const { body, options, owner } = job;
      if (typeof body === 'undefined')
        return {
          error: 'Error calling createOrUpdate - body is missing',
        };
      if (typeof options.where === 'undefined')
        return {
          error: 'Error calling createOrUpdate - options.where is missing',
        };
      const [data, created] = await this.model.findOrBuild(options);
      const previousData = data.toJSON();
      for (const prop in body) {
        data.setDataValue(prop, body[prop]);
      }
      if (owner && owner.id) {
        if (created) {
          data.setDataValue('created_by', owner.id);
        }
        data.setDataValue('updated_by', owner.id);
      }
      await data.save(options);

      if (this.options.history) {
        this.addToHistory({
          entity_id: data.getDataValue('id'),
          action: created ? 'create' : 'update',
          created,
          data: data.toJSON(),
          previous_data: created ? null : previousData,
          created_by: owner.id,
        });
      }

      return { data, created };
    } catch (error) {
      return { error };
    }
  }
}
