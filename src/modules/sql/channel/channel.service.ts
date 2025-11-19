import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Channel } from './entities/channel.entity';

@Injectable()
export class ChannelService extends ModelService<Channel> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Channel> = ['name'];

  constructor(db: SqlService<Channel>) {
    super(db);
  }
}
