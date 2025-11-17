import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { Job, JobResponse } from 'src/core/core.job';
import { compareHash, generateHash } from 'src/core/core.utils';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { User } from './entities/user.entity';

@Injectable()
export class UserService extends ModelService<User> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<User> = ['name', 'email', 'phone'];

  constructor(
    db: SqlService<User>,
    private msClient: MsClientService,
  ) {
    super(db);
  }

  /**
   * Create user with welcome email
   * @param owner - Owner/creator information
   * @param body - User data to create
   * @returns JobResponse with error or created user data
   */
  async createUser(owner: any, body: any): Promise<JobResponse> {
    const { error, data } = await this.create({
      owner,
      action: 'create',
      body,
      payload: {},
    });

    if (error) return { error };

    if (data && data.email && body.send_email !== false) {
      const user = data.toJSON ? data.toJSON() : data;

      this.msClient
        .executeJob(
          'controller.notification',
          new Job({
            action: 'send',
            app: process.env.APP_ID,
            owner,
            payload: {
              template: 'welcome_email',
              variables: {
                TO_NAME: user.name || `${user.first_name} ${user.last_name}`,
                COMPANY_NAME: process.env.APP_ID || 'PeopleCore',
                TO_EMAIL: user.email,
                LOGIN_URL: process.env.BASE_URL || 'http://localhost:3001/login',
              },
              user_id: user.id,
            },
          }),
        )
        .catch((e) => {
          console.error('Failed to send welcome email:', e);
        });
    }

    return { error, data };
  }

  /**
   * Override findById to accept uid parameter and resolve to internal id
   * @param job - Job object with uid and query params
   * @returns JobResponse with user data or error
   */
  async findById(job: any): Promise<JobResponse> {
    const { owner, uid, payload } = job;
    if (uid) {
      const { data: user, error: findError } = await this.findOne({
        owner,
        action: 'findOne',
        payload: {
          where: { uid },
        },
      });

      if (findError || !user) {
        return { error: findError || 'User not found' };
      }
      return await super.findById({
        owner,
        action: 'findById',
        id: user.getDataValue('id'),
        payload,
      });
    }
    return await super.findById(job);
  }

  /**
   * Override update to accept uid parameter and resolve to internal id
   * @param job - Job object with uid and update data
   * @returns JobResponse with updated user data or error
   */
  async update(job: any): Promise<JobResponse> {
    const { owner, uid, body, payload } = job;
    
    // If uid is provided, lookup by uid first to get internal id
    if (uid) {
      const { data: user, error: findError } = await this.findOne({
        owner,
        action: 'findOne',
        payload: {
          where: { uid },
        },
      });

      if (findError || !user) {
        return { error: findError || 'User not found' };
      }

      // Now use the internal id to update
      return await super.update({
        owner,
        action: 'update',
        id: user.getDataValue('id'),
        body,
        payload,
      });
    }
    
    // Otherwise, use the standard update from parent
    return await super.update(job);
  }

  /**
   * Override delete to accept uid parameter and resolve to internal id
   * @param job - Job object with uid
   * @returns JobResponse with deleted user data or error
   */
  async delete(job: any): Promise<JobResponse> {
    const { owner, uid, payload } = job;
    
    // If uid is provided, lookup by uid first to get internal id
    if (uid) {
      const { data: user, error: findError } = await this.findOne({
        owner,
        action: 'findOne',
        payload: {
          where: { uid },
        },
      });

      if (findError || !user) {
        return { error: findError || 'User not found' };
      }

      // Now use the internal id to delete
      return await super.delete({
        owner,
        action: 'delete',
        id: user.getDataValue('id'),
        payload,
      });
    }
    
    // Otherwise, use the standard delete from parent
    return await super.delete(job);
  }

  async changePassword(job: Job): Promise<JobResponse> {
    const { owner, payload } = job;
    if (!(await compareHash(payload.old_password, owner.password))) {
      return { error: 'Invalid old password' };
    }
    try {
      const password = await generateHash(payload.password);
      const { error } = await this.$db.updateRecord({
        owner,
        action: 'findById',
        id: owner.id,
        body: { password },
      });

      if (error) return { error };

      await this.msClient.executeJob(
        'controller.notification',
        new Job({
          action: 'send',
          payload: {
            user_id: owner.id,
            template: 'change_password',
            variables: {
              TIMESTAMP: moment()
                .tz('America/New_York')
                .format('MMM DD, YYYY hh:mm A (z)'),
            },
          },
        }),
      );

      return { data: 'Success' };
    } catch (error) {
      return { error };
    }
  }
}
