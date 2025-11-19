import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Newsfeed } from './entities/newsfeed.entity';

@Injectable()
export class NewsfeedService extends ModelService<Newsfeed> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Newsfeed> = ['name'];

  constructor(db: SqlService<Newsfeed>) {
    super(db);
  }
}
