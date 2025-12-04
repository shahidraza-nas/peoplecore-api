import { Controller, UseGuards } from '@nestjs/common';
import { ChatAccessGuard } from '../chat/chat.guard';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrorResponses,
  MsListener,
} from 'src/core/core.decorators';
import { snakeCase } from 'src/core/core.utils';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageService } from './chat-message.service';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { Job, JobResponse } from 'src/core/core.job';
import { APPEVENTS } from 'src/constants';

const entity = snakeCase(ChatMessage.name);

@ApiTags(entity)
@ApiErrorResponses()
@ApiExtraModels(ChatMessage)
@Controller(entity)
export class ChatMessageController {
  constructor(
    private readonly chatMessageService: ChatMessageService,
    private readonly client: MsClientService,
  ) { }

  /**
   * Queue listener for Messages - Handles WebSocket message flow
   * All message operations are processed through microservice queue
   */
  @MsListener(APPEVENTS.MESSAGE)
  async execute(job: Job): Promise<void> {
    try {
      const response = await this.chatMessageService[job.action]<JobResponse>(
        new Job(job),
      );
      await this.client.jobDone(job, response);
    } catch (error) {
      console.error('[ChatMessageController] Job failed:', {
        action: job.action,
        error: error.message
      });
      throw error;
    }
  }
}
