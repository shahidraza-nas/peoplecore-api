import { SqlModule } from '@core/sql';
import { Module, forwardRef } from '@nestjs/common';
import { Chat } from './entities/chat.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UserModule } from '../user/user.module';
import { MsClientModule } from 'src/core/modules/ms-client/ms-client.module';

@Module({
  imports: [
    SqlModule.register(Chat),
    forwardRef(() => UserModule),
    MsClientModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
