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
