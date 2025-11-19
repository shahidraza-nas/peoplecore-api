import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Message } from './entities/message.entity';

@Injectable()
export class MessageService extends ModelService<Message> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Message> = ['name'];

  constructor(db: SqlService<Message>) {
    super(db);
  }
}
