import { ModelService, SearchFields, SqlGetOneResponse, SqlJob, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Newsfeed } from './entities/newsfeed.entity';

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

  getNewsfeedById(job: SqlJob<Newsfeed>): Promise<SqlGetOneResponse<Newsfeed>> {
    job.payload = {
      ...job.payload,
      where: {
        $or: [
          { created_by: job.owner.id },
          { created_by: job.owner.created_by }
        ]
      }
    };
    return this.findById(job);
  }
}
