import { SqlModule } from '@core/sql';
import { Module, forwardRef } from '@nestjs/common';
import { Chat } from './entities/chat.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UserModule } from '../user/user.module';
import { MsClientModule } from 'src/core/modules/ms-client/ms-client.module';
import { ChatMessageModule } from '../chat-message/chat-message.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ChatAccessGuard } from './chat.guard';

@Module({
  imports: [
    SqlModule.register(Chat),
    forwardRef(() => UserModule),
    forwardRef(() => ChatMessageModule),
    MsClientModule,
    SubscriptionModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatAccessGuard],
  exports: [ChatService],
})
export class ChatModule {}
