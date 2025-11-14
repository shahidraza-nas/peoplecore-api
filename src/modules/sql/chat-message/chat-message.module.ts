import { SqlModule } from '@core/sql';
import { Module, forwardRef } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageController } from './chat-message.controller';
import { ChatMessageService } from './chat-message.service';
import { UserModule } from '../user/user.module';
import { ChatModule } from '../chat/chat.module';
import { MsClientModule } from 'src/core/modules/ms-client/ms-client.module';

@Module({
  imports: [
    SqlModule.register(ChatMessage),
    forwardRef(() => UserModule),
    forwardRef(() => ChatModule),
    MsClientModule,
  ],
  controllers: [ChatMessageController],
  providers: [ChatMessageService],
  exports: [ChatMessageService],
})
export class ChatMessageModule {}
