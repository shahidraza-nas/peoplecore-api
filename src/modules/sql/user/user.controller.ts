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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  ApiErrorResponses,
  FileUploads,
  ResponseCreated,
  ResponseDeleted,
  ResponseGetAll,
  ResponseGetOne,
  ResponseUpdated,
} from 'src/core/core.decorators';
import { NotFoundError, ValidationError } from 'src/core/core.errors';
import {
  BadRequest,
  Created,
  ErrorResponse,
  NotFound,
  Result,
} from 'src/core/core.responses';
import { OwnerIncludeAttribute } from 'src/core/decorators/sql/owner-attributes.decorator';
import { Owner, OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { Roles } from 'src/core/decorators/sql/roles.decorator';
import { ApiQueryCreate, ApiQueryUpdate } from 'src/core/dto/query.dto';
import { Role } from '../user/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiExtraModels(User)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  /**
   * Create a new User
   */
  @Post()
  // @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @FileUploads([{ name: 'avatar_file', required: false, bodyField: 'avatar' }])
  @ResponseCreated(User)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() createUserDto: CreateUserDto,
    @Query() query: ApiQueryCreate,
  ) {
    const { error, data } = await this.userService.create({
      owner,
      action: 'create',
      body: createUserDto,
      payload: { ...query },
    });

    if (error) {
      if (error instanceof ValidationError) {
        return BadRequest(res, { error, message: error.message });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Created(res, { data: { user: data }, message: 'Created' });
  }

  /**
   * Update logged in user details
   */
  @Put('me')
  @ApiOperation({ summary: 'Update logged in user details' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @FileUploads([{ name: 'avatar_file', required: false, bodyField: 'avatar' }])
  @ResponseUpdated(User)
  async updateMe(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() updateUserDto: UpdateUserDto,
    @Query() query: ApiQueryUpdate,
  ) {
    const { error, data } = await this.userService.update({
      owner,
      action: 'update',
      id: owner.id,
      body: updateUserDto,
      payload: { ...query },
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, { error, message: `Record not found` });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { user: data }, message: 'Updated' });
  }

  /**
   * Change password for logged in user
   */
  @Put('password')
  @ApiOperation({ summary: 'Change password for logged in user' })
  @ApiOkResponse({
    description: 'Success',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Password changed',
        },
      },
    },
  })
  @OwnerIncludeAttribute('password')
  async changePassword(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const { error } = await this.userService.changePassword({
      owner,
      action: 'changePassword',
      payload: changePasswordDto,
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
    return Result(res, { message: 'Password changed' });
  }

  /**
   * Update a User using uid
   */
  @Put(':uid')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update a user using uid' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @FileUploads([{ name: 'avatar_file', required: false, bodyField: 'avatar' }])
  @ResponseUpdated(User)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('uid') uid: string,
    @Body() updateUserDto: UpdateUserDto,
    @Query() query: ApiQueryUpdate,
  ) {
    const { error, data } = await this.userService.update({
      owner,
      action: 'update',
      uid,
      body: updateUserDto,
      payload: { ...query },
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, { error, message: `Record not found` });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { user: data }, message: 'Updated' });
  }

  /**
   * Return all Users list
   */
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ResponseGetAll(User)
  async findAll(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: any,
  ) {
    const { error, data, offset, limit, count } =
      await this.userService.findAll({
        owner,
        action: 'findAll',
        payload: {
          ...query,
          where: {
            created_by: owner.id
          }
        },
      });

    if (error) {
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, {
      data: { users: data, offset, limit, count },
      message: 'Ok',
    });
  }

  /**
   * Get users created by logged-in user
   */
  @Get('my-users')
  @ApiOperation({ summary: 'Get users created by me' })
  @ResponseGetAll(User)
  async getMyUsers(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: any,
  ) {
    const { error, data, offset, limit, count } =
      await this.userService.getOwnedUsers({
        owner,
        action: 'getMyUsers',
        payload: { ...query },
      });

    if (error) {
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, {
      data: { users: data, offset, limit, count },
      message: 'Ok',
    });
  }

  /**
   * Find one User
   */
  @Get('find')
  @ApiOperation({ summary: 'Find a user' })
  @ResponseGetOne(User)
  async findOne(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: any,
  ) {
    const { error, data } = await this.userService.findOne({
      owner,
      action: 'findOne',
      payload: { ...query },
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, { error, message: `Record not found` });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { user: data }, message: 'Ok' });
  }

  /**
   * Get logged in user details
   */
  @Get('me')
  @ApiOperation({ summary: 'Get logged in user details' })
  @ResponseGetOne(User)
  async findMe(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: any,
  ) {
    const { error, data } = await this.userService.findById({
      owner,
      action: 'findById',
      id: owner.id,
      payload: { ...query },
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, { error, message: `Record not found` });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { user: data }, message: 'Ok' });
  }

  /**
   * Get a User by uid
   */
  @Get(':uid')
  @ApiOperation({ summary: 'Get a user using uid' })
  @ResponseGetOne(User)
  async findById(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('uid') uid: string,
    @Query() query: any,
  ) {
    const { error, data } = await this.userService.findById({
      owner,
      action: 'findById',
      uid,
      payload: { ...query },
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, { error, message: `Record not found` });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { user: data }, message: 'Ok' });
  }

  /**
   * Delete a User using uid
   */
  @Delete(':uid')
  // @Roles(Role.Admin)
  @ApiOperation({ summary: 'Delete a user using uid' })
  @ResponseDeleted(User)
  async delete(
    @Req() req: Request,
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('uid') uid: string,
    @Query() query: any,
  ) {
    const { error, data } = await this.userService.delete({
      owner,
      action: 'delete',
      uid,
      payload: {
        ...query,
        where: {
          created_by: owner.id
        }
      },
    });

    if (error) {
      if (error instanceof NotFoundError) {
        return NotFound(res, { error, message: `Record not found` });
      }
      return ErrorResponse(res, {
        error,
        message: `${error.message || error}`,
      });
    }
    return Result(res, { data: { user: data }, message: 'Deleted' });
  }
}
