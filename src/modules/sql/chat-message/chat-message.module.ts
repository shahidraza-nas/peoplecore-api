import { SqlModule } from '@core/sql';
import { Module, forwardRef } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageController } from './chat-message.controller';
import { ChatMessageService } from './chat-message.service';
import { UserModule } from '../user/user.module';
import { ChatModule } from '../chat/chat.module';
import { MsClientModule } from 'src/core/modules/ms-client/ms-client.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ChatAccessGuard } from '../chat/chat.guard';

@Module({
  imports: [
    SqlModule.register(ChatMessage),
    forwardRef(() => UserModule),
    forwardRef(() => ChatModule),
    MsClientModule,
    SubscriptionModule,
  ],
  controllers: [ChatMessageController],
  providers: [ChatMessageService, ChatAccessGuard],
  exports: [ChatMessageService],
})
export class ChatMessageModule {}
