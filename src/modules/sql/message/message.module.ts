import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';
import { Message } from './entities/message.entity';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

@Module({
  imports: [SqlModule.register(Message)],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
