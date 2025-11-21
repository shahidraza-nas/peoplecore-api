import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable, NotAcceptableException } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { Job, JobResponse } from 'src/core/core.job';
import { compareHash, generateHash } from 'src/core/core.utils';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { APPEVENTS } from 'src/constants';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { User } from './entities/user.entity';
import { Role } from './role.enum';

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

    if (!owner && data) {
      await data.update({ created_by: data.getDataValue('id') });
    }

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

      return await super.update({
        owner,
        action: 'update',
        id: user.getDataValue('id'),
        body,
        payload,
      });
    }

    return await super.update(job);
  }

  /**
   * Override delete to accept uid parameter and resolve to internal id
   * @param job - Job object with uid
   * @returns JobResponse with deleted user data or error
   */
  async delete(job: any): Promise<JobResponse> {
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

      return await super.delete({
        owner,
        action: 'delete',
        id: user.getDataValue('id'),
        payload,
      });
    }

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

  /**
   * Get dashboard statistics
   * @param job - Job object with owner
   * @returns JobResponse with dashboard statistics
   */
  async getDashboardStats(job: Job): Promise<JobResponse> {
    const { owner } = job;

    try {
      // total users count (excluding admin and self)
      const { count: totalUsers } = await this.getCount({
        owner,
        action: 'getCount',
        payload: {
          where: {
            ...(owner.role !== Role.Admin && { created_by: owner.id }),
            role: { $ne: Role.Admin },
            id: { $ne: owner.id },
          },
        },
      });

      // active users (users with recent login)
      const { count: activeUsers } = await this.getCount({
        owner,
        action: 'getCount',
        payload: {
          where: {
            ...(owner.role !== Role.Admin && { created_by: owner.id }),
            role: { $ne: Role.Admin },
            id: { $ne: owner.id },
            last_login_at: { $ne: null },
          },
        },
      });

      // admin users count
      const { count: adminUsers } = await this.getCount({
        owner,
        action: 'getCount',
        payload: {
          where: {
            role: Role.Admin,
          },
        },
      });

      // Get regular users count
      const { count: regularUsers } = await this.getCount({
        owner,
        action: 'getCount',
        payload: {
          where: {
            ...(owner.role !== Role.Admin && { created_by: owner.id }),
            role: Role.User,
            id: { $ne: owner.id },
          },
        },
      });

      // recent users (last 5)
      const { data: recentUsers } = await this.findAll({
        owner,
        action: 'findAll',
        payload: {
          offset: 0,
          limit: 5,
          where: {
            ...(owner.role !== Role.Admin && { created_by: owner.id }),
            role: { $ne: Role.Admin },
            id: { $ne: owner.id },
          },
          sort: [['created_at', 'desc']],
        },
      });
      let totalChats = 0;
      try {
        const { Chat } = await import('../chat/entities/chat.entity');
        totalChats = await Chat.count({
          where: {
            $or: [
              { user1Id: owner.id },
              { user2Id: owner.id },
            ],
          },
        });
      } catch (e) {
      }

      return {
        data: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          adminUsers: adminUsers || 0,
          regularUsers: regularUsers || 0,
          totalChats: totalChats || 0,
          recentUsers: recentUsers || [],
        },
      };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Get users created by the logged-in user
   * @param job - Job object with owner and query params
   * @returns JobResponse with list of users created by owner
   */
  async getOwnedUsers(job: Job) {
    const { owner, payload = {} } = job;

    const where = {
      ...payload.where,
      created_by: owner.id,
    };

    return await this.findAll({
      owner,
      action: 'findAll',
      payload: {
        ...payload,
        where,
      },
    });
  }

  /**
   * Soft delete a user from database.
   * Invalidates all user sessions.
   * @param {OwnerDto} owner - an object with details of logged in user
   * @returns {Promise<{data: User, error: any}>}
   */
  async deleteUser(owner: OwnerDto): Promise<JobResponse> {
    const { data: deleted, error: deletedErr } = await this.delete({
      action: 'delete',
      owner,
      id: owner.id,
    });

    if (!!deleted) {
      await this.msClient.executeJob(
        APPEVENTS.USER,
        new Job({
          action: 'invalidateUserSessions',
          app: process.env.APP_ID,
          owner,
          payload: {
            userId: owner.id,
          },
        }),
      );
    }

    return { data: deleted, error: deletedErr };
  }
}
