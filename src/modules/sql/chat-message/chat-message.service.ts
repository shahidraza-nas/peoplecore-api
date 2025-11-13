import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatMessageService extends ModelService<ChatMessage> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<ChatMessage> = ['name'];

  constructor(db: SqlService<ChatMessage>) {
    super(db);
  }
}
