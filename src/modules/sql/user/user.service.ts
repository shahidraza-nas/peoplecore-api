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
  searchFields: SearchFields<User> = ['name', 'email'];

  constructor(
    db: SqlService<User>,
    private msClient: MsClientService,
  ) {
    super(db);
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
