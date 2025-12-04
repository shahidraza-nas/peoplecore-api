import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable, NotAcceptableException } from '@nestjs/common';
import moment from 'moment-timezone';
import { Job, JobResponse } from 'src/core/core.job';
import { compareHash, generateHash } from 'src/core/core.utils';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { APPEVENTS } from 'src/constants';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { User } from './entities/user.entity';
import { Role } from './role.enum';
import { Sequelize } from 'sequelize';

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
   * Get all users with bidirectional employee visibility
   * Non-admin users can see:
   * 1. Users they created (employees they added)
   * 2. Users who created them (their manager/admin)
   * @param owner - Owner/authenticated user
   * @param query - Query parameters from controller
   * @returns JobResponse with list of users
   */
  async findAllUsers(owner: OwnerDto, query: any): Promise<any> {
    const whereClause: any = Object.assign({}, query.where, {
      role: {
        $ne: Role.Admin
      },
      id: {
        $ne: owner.id
      }
    });

    /**
     * Non-admin users can see:
     * 1. Users they created (employees they added)
     * 2. Users who created them (their manager/admin)
     */
    if (owner.role !== Role.Admin) {
      whereClause.$or = [
        { created_by: owner.id },      // Users I created
        { id: owner.created_by },       // User who created me
      ];
    }

    return await super.findAll({
      owner,
      action: 'findAll',
      payload: Object.assign({}, query, {
        where: whereClause,
      }),
    });
  }

  /**
   * Find one user
   * @param owner - Owner/authenticated user
   * @param query - Query parameters from controller
   * @returns JobResponse with user data or error
   */
  async findOneUser(owner: OwnerDto, query: any): Promise<any> {
    return await this.findOne({
      owner,
      action: 'findOne',
      payload: query,
    });
  }

  /**
   * Find logged-in user details with unread messages count
   * @param owner - Owner/authenticated user
   * @param query - Query parameters from controller
   * @param Sequelize - Sequelize instance for raw queries
   * @returns JobResponse with user data including unread_messages_count
   */
  async findMeUser(owner: OwnerDto, query: any): Promise<any> {
    const { select, populate, scope } = query;

    const payload = Object.assign({}, {
      select: select?.length ? [...select, 'unread_messages_count'] : undefined,
      populate,
      scope,
    });

    const options = {
      attributes: [
        ...(select || ['uid', 'name', 'first_name', 'last_name', 'email', 'role', 'avatar', 'enable_2fa', 'phone_code', 'phone', 'send_email', 'send_sms', 'send_push']),
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM chat_messages WHERE to_user_id = ${owner.id} AND is_read = false)`,
          ),
          'unread_messages_count',
        ],
      ],
    };

    return await super.findById({
      owner,
      action: 'findById',
      id: owner.id,
      payload,
      options,
    });
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
          APPEVENTS.NOTIFICATION,
          // 'controller.notification',
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
   * Find user by uid with permission checks
   * @param owner - Owner/authenticated user
   * @param uid - User uid to find
   * @param query - Optional query parameters
   * @returns JobResponse with user data or error
   */
  async findUserByUid(owner: OwnerDto, uid: string, query?: any): Promise<JobResponse> {
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

    if (owner.role !== Role.Admin) {
      const targetUserId = user.getDataValue('id');
      const targetCreatedBy = user.getDataValue('created_by');

      if (targetCreatedBy !== owner.id && targetUserId !== owner.created_by) {
        return { error: 'Permission denied. You can only view users you created or who created you.' };
      }
    }

    return await super.findById({
      owner,
      action: 'findById',
      id: user.getDataValue('id'),
      payload: query || {},
    });
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

      /**
       * Permission check: 
       * Non-admin users can only update users they created (employees)
       */
      if (owner.role !== Role.Admin) {
        const targetCreatedBy = user.getDataValue('created_by');

        /**
         * Only allow update if current user created this user (manager can update employee)
         */
        if (targetCreatedBy !== owner.id) {
          return { error: 'Permission denied. You can only update users you created.' };
        }
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
   * Delete user by uid with permission checks
   * @param owner - Owner/authenticated user
   * @param uid - User uid to delete
   * @param query - Query parameters (mode, etc.)
   * @returns JobResponse with deleted user data or error
   */
  async deleteUserByUid(owner: OwnerDto, uid: string, query: any): Promise<JobResponse> {
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

    /**
     * Permission check: 
     * Non-admin users can only delete users they created (employees)
     */
    if (owner.role !== Role.Admin) {
      const targetCreatedBy = user.getDataValue('created_by');

      /**
       * Only allow delete if current user created this user (manager can delete employee)
       */
      if (targetCreatedBy !== owner.id) {
        return { error: 'Permission denied. You can only delete users you created.' };
      }
    }

    const payload = Object.assign({}, query, {
      where: Object.assign({}, query.where, {
        created_by: owner.id
      })
    });

    return await super.delete({
      owner,
      action: 'delete',
      id: user.getDataValue('id'),
      payload,
    });
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
        APPEVENTS.NOTIFICATION,
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
      const { data: recentUsers } = await this.findAllUsers(owner, {
        offset: 0,
        limit: 5,
        where: {
          ...(owner.role !== Role.Admin && { created_by: owner.id }),
          role: { $ne: Role.Admin },
          id: { $ne: owner.id },
        },
        sort: [['created_at', 'desc']],
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
  async getOwnedUsers(owner: OwnerDto, query: any) {
    const where = Object.assign({}, query.where, {
      created_by: owner.id,
    });

    return await this.findAllUsers(owner, Object.assign({}, query, {
      where,
    }));
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
