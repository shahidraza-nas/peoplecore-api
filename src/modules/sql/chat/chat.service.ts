import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { Chat } from './entities/chat.entity';

@Injectable()
export class ChatService extends ModelService<Chat> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Chat> = ['name'];

  constructor(db: SqlService<Chat>) {
    super(db);
  }
}
