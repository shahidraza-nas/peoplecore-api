import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChatAccessGuard } from './chat.guard';
import { Response } from 'express';
import {
  ApiErrorResponses,
  ResponseCountAll,
  ResponseCreated,
  ResponseDeleted,
  ResponseGetAll,
  ResponseGetOne,
  ResponseUpdated,
} from 'src/core/core.decorators';
import { NotFoundError } from 'src/core/core.errors';
import {
  Created,
  ErrorResponse,
  NotFound,
  Result,
} from 'src/core/core.responses';
import { pluralizeString, snakeCase } from 'src/core/core.utils';
import { Owner, OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import {
  ApiQueryCountAll,
  ApiQueryCreate,
  ApiQueryDelete,
  ApiQueryGetAll,
  ApiQueryGetOne,
  ApiQueryUpdate,
} from 'src/core/dto/query.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { Chat } from './entities/chat.entity';
import { ChatService } from './chat.service';
import { MsListener } from 'src/core/core.decorators';
import { APPEVENTS } from 'src/constants';
import { Job, JobResponse } from 'src/core/core.job';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';

const entity = snakeCase(Chat.name);

@ApiTags(entity)
@ApiBearerAuth()
@ApiErrorResponses()
@ApiExtraModels(Chat)
@UseGuards(ChatAccessGuard)
@Controller(entity)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly msClient: MsClientService,
  ) { }

  /**
   * Queue listener for Chat events
   */
  @MsListener(APPEVENTS.CHAT)
  async execute(job: Job): Promise<void> {
    const response = await this.chatService[job.action]<JobResponse>(
      new Job(job),
    );
    await this.msClient.jobDone(job, response);
  }

  /**
   * Create or find a chat with another user
   */
  @Post()
  @ApiOperation({ summary: `Create or find chat with user` })
  @ResponseCreated(Chat)
  async create(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() createChatDto: CreateChatDto,
    @Query() query: ApiQueryCreate,
  ) {
    try {
      const { error, data } = await this.chatService.findOrCreateChat(
        owner,
        createChatDto.userUid,
      );

      if (error) {
        return ErrorResponse(res, {
          error,
          message: `${error}`,
        });
      }

      return Created(res, { data: { [entity]: data }, message: 'Chat ready' });
    } catch (error) {
      return ErrorResponse(res, {
        error,
        message: error.message || 'Failed to create chat',
      });
    }
  }

  /**
   * Update an entity document by using id
   */
  @Put(':id')
  @ApiOperation({ summary: `Update ${entity} using id` })
  @ResponseUpdated(Chat)
  async update(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') id: number,
    @Body() updateChatDto: UpdateChatDto,
    @Query() query: ApiQueryUpdate,
  ) {
    const { error, data } = await this.chatService.update({
      owner,
      action: 'update',
      id: +id,
      body: updateChatDto,
      payload: { ...query },
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, {
          error,
          message: `Record not found`,
        });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { [entity]: data }, message: 'Updated' });
  }

  /**
   * Return all entity documents list (my chats)
   */
  @Get()
  @ApiOperation({ summary: `Get my ${pluralizeString(entity)}` })
  @ResponseGetAll(Chat)
  async findAll(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryGetAll,
  ) {
    const { error, data, offset, limit, count } =
      await this.chatService.getMyChats(owner, query);

    if (error) {
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, {
      data: { [pluralizeString(entity)]: data, offset, limit, count },
      message: 'Ok',
    });
  }

  /**
   * Return count of entity documents
   */
  @Get('count')
  @ApiOperation({ summary: `Get count of ${pluralizeString(entity)}` })
  @ResponseCountAll()
  async countAll(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryCountAll,
  ) {
    const { error, count } = await this.chatService.getCount({
      owner,
      action: 'getCount',
      payload: { ...query },
    });

    if (error) {
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, {
      data: { count },
      message: 'Ok',
    });
  }

  /**
   * Get messages for a specific chat
   * IMPORTANT: Must be before @Delete(':id') to avoid route conflict
   */
  @Get(':chatUid/messages')
  @ApiOperation({ summary: 'Get Messages' })
  @ResponseGetAll(Chat)
  async getMessages(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: any,
    @Param('chatUid') chatUid: string,
  ) {
    const { error, data, count, limit, offset } =
      await this.chatService.getChatMessages(owner, chatUid, query);

    if (error) {
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }

    return Result(res, {
      data: { messages: data, count, limit, offset },
      message: 'Ok',
    });
  }

  /**
   * Mark all messages as read
   * IMPORTANT: Must be before @Delete(':id') to avoid route conflict
   */
  @Get(':chatUid/messages/readAll')
  @ApiOperation({ summary: 'Read All Messages' })
  @ResponseGetAll(Chat)
  async readAllMessages(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('chatUid') chatUid: string,
  ) {
    const { error, data } = await this.chatService.readAllMessages(
      new Job({
        app: process.env.APP_ID,
        action: 'readAllMessages',
        owner,
        payload: { chatUid },
      }),
    );

    if (error) {
      return ErrorResponse(res, {
        error,
        message: error.message || 'Failed to mark messages as read',
      });
    }

    return Result(res, {
      data: data || {},
      message: 'Messages marked as read',
    });
  }

  /**
   * Delete an entity document by using id
   */
  @Delete(':id')
  @ApiOperation({ summary: `Delete ${entity} using id` })
  @ResponseDeleted(Chat)
  async delete(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') id: number,
    @Query() query: ApiQueryDelete,
  ) {
    const { error, data } = await this.chatService.delete({
      owner,
      action: 'delete',
      id: +id,
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, {
          error,
          message: `Record not found`,
        });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { [entity]: data }, message: 'Deleted' });
  }

}
