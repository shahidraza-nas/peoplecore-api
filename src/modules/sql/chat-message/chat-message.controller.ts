import { Controller, UseGuards, Post, Param, Body, Res } from '@nestjs/common';
import { ChatAccessGuard } from '../chat/chat.guard';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrorResponses,
  MsListener,
  ResponseCreated,
} from 'src/core/core.decorators';
import { snakeCase } from 'src/core/core.utils';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageService } from './chat-message.service';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { Job, JobResponse } from 'src/core/core.job';
import { APPEVENTS } from 'src/constants';
import { Owner, OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { Response } from 'express';
import { Created, ErrorResponse } from 'src/core/core.responses';

const entity = snakeCase(ChatMessage.name);

@ApiTags(entity)
@ApiErrorResponses()
@ApiExtraModels(ChatMessage)
// @UseGuards(ChatAccessGuard)
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

  @Post(':id/reaction')
  async addReaction(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') messageId: string,
    @Body() body: { action: 'add' | 'remove'; emoji: string },
  ) {
    try {
      const data = await this.chatMessageService[body.action === 'add' ? 'addReaction' : 'removeReaction']({
        owner,
        action: body.action === 'add' ? 'addReaction' : 'removeReaction',
        payload: { messageUid: messageId, emoji: body.emoji },
      });
      return Created(res, { data: { reaction: data }, message: 'Reaction updated' });
    } catch (error) {
      return ErrorResponse(res, { error, message: error.message });
    }
  }
}
