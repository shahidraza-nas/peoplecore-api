import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
  ApiQueryGetById,
  ApiQueryGetOne,
  ApiQueryUpdate,
} from 'src/core/dto/query.dto';
import { CreateNewsfeedDto } from './dto/create-newsfeed.dto';
import { UpdateNewsfeedDto } from './dto/update-newsfeed.dto';
import { Newsfeed } from './entities/newsfeed.entity';
import { NewsfeedService } from './newsfeed.service';

const entity = snakeCase(Newsfeed.name);

@ApiTags(entity)
@ApiBearerAuth()
@ApiErrorResponses()
@ApiExtraModels(Newsfeed)
@Controller(entity)
export class NewsfeedController {
  constructor(private readonly newsfeedService: NewsfeedService) { }

  /**
   * Create a new entity document
   */
  @Post()
  @ApiOperation({ summary: `Create new ${entity}` })
  @ResponseCreated(Newsfeed)
  async create(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() createNewsfeedDto: CreateNewsfeedDto,
  ) {
    const { error, data } = await this.newsfeedService.createNewsfeed(
      owner,
      createNewsfeedDto,
    );

    if (error) {
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Created(res, { data: { [entity]: data }, message: 'Created' });
  }

  /**
   * Update an entity document by using id
   */
  @Put(':id')
  @ApiOperation({ summary: `Update ${entity} using id` })
  @ResponseUpdated(Newsfeed)
  async update(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') id: number,
    @Body() updateNewsfeedDto: UpdateNewsfeedDto,
  ) {
    const { error, data } = await this.newsfeedService.updateNewsfeedById(
      owner,
      +id,
      updateNewsfeedDto,
    );

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
   * Return all entity documents list
   */
  @Get()
  @ApiOperation({ summary: `Get all ${pluralizeString(entity)}` })
  @ResponseGetAll(Newsfeed)
  async findAll(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryGetAll,
  ) {
    const { error, data, offset: resOffset, limit: resLimit, count } =
      await this.newsfeedService.findAllNewsfeeds(owner, query);

    if (error) {
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, {
      data: { [pluralizeString(entity)]: data, offset: resOffset, limit: resLimit, count },
      message: 'Ok',
    });
  }
  /**
   * Get newsfeeds created by logged-in user
   */
  @Get('my-newsfeeds')
  @ApiOperation({ summary: `Get newsfeeds created by me` })
  @ResponseGetAll(Newsfeed)
  async getMyNewsfeeds(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryGetAll,
  ) {
    const { error, data, offset, limit, count } =
      await this.newsfeedService.getMyNewsfeeds(owner, query);

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
  ) {
    const { error, count } = await this.newsfeedService.countAllNewsfeeds(
      owner,
    );

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
   * Find one entity document
   */
  @Get('find')
  @ApiOperation({ summary: `Find one ${entity}` })
  @ResponseGetOne(Newsfeed)
  async findOne(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryGetOne,
  ) {
    const { error, data } = await this.newsfeedService.findOneNewsfeed(
      owner,
      query,
    );

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
    return Result(res, { data: { [entity]: data }, message: 'Ok' });
  }

  /**
   * Get an entity document by using id
   */
  @Get(':id')
  @ApiOperation({ summary: `Find ${entity} using id` })
  @ResponseGetOne(Newsfeed)
  async findById(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') id: number,
    @Query() query: ApiQueryGetById,
  ) {
    const { error, data } = await this.newsfeedService.findNewsfeedById(
      owner,
      +id,
      query,
    );

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
    return Result(res, { data: { [entity]: data }, message: 'Ok' });
  }

  /**
   * Delete an entity document by using id
   */
  @Delete(':uid')
  @ApiOperation({ summary: `Delete ${entity} using uid` })
  @ResponseDeleted(Newsfeed)
  async delete(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('uid') uid: string,
    @Query() query: ApiQueryDelete,
  ) {
    const { error, data } = await this.newsfeedService.deleteNewsfeedByUid(
      owner,
      uid,
      query,
    );

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
