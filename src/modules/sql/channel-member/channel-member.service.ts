import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { ChannelMember } from './entities/channel-member.entity';

@Injectable()
export class ChannelMemberService extends ModelService<ChannelMember> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<ChannelMember> = ['name'];

  constructor(db: SqlService<ChannelMember>) {
    super(db);
  }
}
