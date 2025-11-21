import { ModelService, SearchFields, SqlDeleteResponse, SqlGetAllResponse, SqlGetOneResponse, SqlJob, SqlService, SqlUpdateResponse } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Role } from 'src/modules/sql/user/role.enum';
import { Newsfeed } from './entities/newsfeed.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class NewsfeedService extends ModelService<Newsfeed> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Newsfeed> = ['title', 'content'];

  constructor(db: SqlService<Newsfeed>) {
    super(db);
  }

  /**
   * Override findAll to implement bidirectional visibility
   * Users can see:
   * 1. Newsfeeds they created
   * 2. Newsfeeds created by users they manage (users with created_by = owner.id)
   * 3. Newsfeeds created by their manager (user who has id = owner.created_by)
   */
  async findAll(job: SqlJob<Newsfeed>): Promise<SqlGetAllResponse<Newsfeed>> {
    const { owner, payload = {} } = job;

    if (owner.role === Role.Admin) {
      return super.findAll(job);
    }
    const managedUsers = await User.findAll({
      where: { created_by: owner.id },
      attributes: ['id'],
      raw: true,
    });

    const managedUserIds = managedUsers.map((u: any) => u.id);
    const visibilityFilter: any = {
      $or: [
        { created_by: owner.id },
      ],
    };
    if (managedUserIds.length > 0) {
      visibilityFilter.$or.push({ created_by: { $in: managedUserIds } });
    }
    if (owner.created_by) {
      visibilityFilter.$or.push({ created_by: owner.created_by });
    }

    const whereClause = {
      ...payload.where,
      ...visibilityFilter,
    };

    return super.findAll({
      ...job,
      payload: {
        ...payload,
        where: whereClause,
      },
    });
  }

  /**
   * Get newsfeed by ID with visibility filtering
   * Uses findOne with visibility check instead of direct findById
   */
  async getNewsfeedById(job: SqlJob<Newsfeed>): Promise<SqlGetOneResponse<Newsfeed>> {
    const { owner, id } = job;
    if (owner.role === Role.Admin) {
      return this.findById(job);
    }
    const managedUsers = await User.findAll({
      where: { created_by: owner.id },
      attributes: ['id'],
      raw: true,
    });

    const managedUserIds = managedUsers.map((u: any) => u.id);
    const visibilityFilter: any = {
      id,
      $or: [
        { created_by: owner.id },
      ],
    };
    if (managedUserIds.length > 0) {
      visibilityFilter.$or.push({ created_by: { $in: managedUserIds } });
    }

    if (owner.created_by) {
      visibilityFilter.$or.push({ created_by: owner.created_by });
    }

    return this.findOne({
      ...job,
      payload: {
        ...job.payload,
        where: visibilityFilter,
      },
    });
  }

  /**
   * Override update to add permission check
   * Employees can only update newsfeeds they created
   */
  async update(job: SqlJob<Newsfeed>): Promise<SqlUpdateResponse<Newsfeed>> {
    if (job.owner.role === Role.Admin) {
      return super.update(job);
    }
    const { data: existingNewsfeed, error: findError } = await this.findById({
      ...job,
      payload: { select: ['id', 'created_by'] }
    });

    if (findError || !existingNewsfeed) {
      return { error: findError || new Error('Newsfeed not found') };
    }

    if (existingNewsfeed.created_by !== job.owner.id) {
      return { error: new Error('Permission denied. You can only update newsfeeds you created.') };
    }

    return super.update(job);
  }

  /**
   * Override delete to add permission check
   * Employees can only delete newsfeeds they created
   */
  async delete(job: SqlJob<Newsfeed>): Promise<SqlDeleteResponse<Newsfeed>> {
    if (job.owner.role === Role.Admin) {
      return super.delete(job);
    }
    const { data: existingNewsfeed, error: findError } = await this.findOne({
      ...job,
      payload: { 
        where: { uid: job.uid },
        select: ['id', 'created_by'] 
      }
    });

    if (findError || !existingNewsfeed) {
      return { error: findError || new Error('Newsfeed not found') };
    }
    if (existingNewsfeed.created_by !== job.owner.id) {
      return { error: new Error('Permission denied. You can only delete newsfeeds you created.') };
    }

    return super.delete(job);
  }
}
