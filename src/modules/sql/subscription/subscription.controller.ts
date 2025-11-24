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
  ApiQueryGetAll,
  ApiQueryGetOne,
  ApiQueryUpdate,
} from 'src/core/dto/query.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Subscription as SubscriptionEntity } from './entities/subscription.entity';
import { SubscriptionService } from './subscription.service';

const entity = snakeCase(SubscriptionEntity.name);

@ApiTags(entity)
@ApiBearerAuth()
@ApiErrorResponses()
@ApiExtraModels(SubscriptionEntity)
@Controller(entity)
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
  ) { }

  /**
   * SUBSCRIPTION ENDPOINTS >>>
   */

  /**
   * Create Stripe checkout session for one-time payment
   */
  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create checkout session for subscription payment' })
  @ResponseCreated(Object)
  async createCheckoutSession(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    const { error, data: session } = await this.subscriptionService.createCheckoutSession(
      owner.id,
      owner.email,
      createCheckoutDto.amount || 10, // Default $10
      createCheckoutDto.planType || 'chat_monthly',
    );

    if (error) {
      return ErrorResponse(res, { error, message: error.message });
    }

    return Created(res, {
      data: { sessionUrl: session.url, sessionId: session.id },
      message: 'Checkout session created',
    });
  }

  /**
 * Check user's subscription status
 */
  @Get('status')
  @ApiOperation({ summary: 'Get current subscription status' })
  @ResponseGetOne(Object)
  async getStatus(@Res() res: Response, @Owner() owner: OwnerDto) {
    try {
      const hasAccess = await this.subscriptionService.checkChatAccess(owner.id);
      const subscription = await this.subscriptionService.getUserSubscription(owner.id);

      return Result(res, {
        data: { hasAccess, subscription },
        message: 'Ok',
      });
    } catch (error) {
      return ErrorResponse(res, { error, message: error.message });
    }
  }

  /**
 * Get user's subscription history
 */
  @Get('history')
  @ApiOperation({ summary: 'Get user subscription history' })
  @ResponseGetAll(SubscriptionEntity)
  async getHistory(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryGetAll
  ) {
    const { error, data, count } = await this.subscriptionService.findAll({
      owner,
      action: 'findAll',
      payload: {
        where: { user_id: owner.id },
        sort: [['created_at', 'desc']],
        ...query,
      },
    });

    if (error) {
      return ErrorResponse(res, { error, message: error.message });
    }

    return Result(res, {
      data: { subscriptions: data, count },
      message: 'Ok',
    });
  }

  /**
 * Get subscription metrics (admin only)
 */
  @Get('metrics')
  @ApiOperation({ summary: 'Get subscription analytics and metrics' })
  @ResponseGetOne(Object)
  async getMetrics(@Res() res: Response) {
    const { error, data } = await this.subscriptionService.getSubscriptionMetrics();

    if (error) {
      return ErrorResponse(res, { error, message: error.message });
    }

    return Result(res, {
      data: { metrics: data },
      message: 'Ok',
    });
  }

  /**
 * Cancel subscription
 */
  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel active subscription' })
  async cancelSubscription(@Res() res: Response, @Owner() owner: OwnerDto) {
    try {
      const { error, data } = await this.subscriptionService.cancelUserSubscription(owner.id);

      if (error) {
        return ErrorResponse(res, { error, message: error.message });
      }

      return Result(res, {
        data: { subscription: data },
        message: 'Subscription cancelled',
      });
    } catch (error) {
      return ErrorResponse(res, { error, message: error.message });
    }
  }

  /**
   * Process payment after successful checkout
   */
  @Get('process-payment/:sessionId')
  @ApiOperation({ summary: 'Process payment and activate subscription' })
  async processPayment(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('sessionId') sessionId: string,
  ) {
    const { error, data } = await this.subscriptionService.processPayment(sessionId);

    if (error) {
      return ErrorResponse(res, { error, message: error.message });
    }

    return Result(res, {
      data: { subscription: data },
      message: 'Subscription activated',
    });
  }

  /**
   * <<< SUBSCRIPTION ENDPOINTS
   */

  /**
   * Create a new entity document
   */
  @Post()
  @ApiOperation({ summary: `Create new ${entity}` })
  @ResponseCreated(SubscriptionEntity)
  async create(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Query() query: ApiQueryCreate,
  ) {
    const { error, data } = await this.subscriptionService.create({
      owner,
      action: 'create',
      body: createSubscriptionDto,
      payload: { ...query },
    });

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
  @ResponseUpdated(SubscriptionEntity)
  async update(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') id: number,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Query() query: ApiQueryUpdate,
  ) {
    const { error, data } = await this.subscriptionService.update({
      owner,
      action: 'update',
      id: +id,
      body: updateSubscriptionDto,
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
   * Return all entity documents list
   */
  @Get()
  @ApiOperation({ summary: `Get all ${pluralizeString(entity)}` })
  @ResponseGetAll(SubscriptionEntity)
  async findAll(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryGetAll,
  ) {
    const { error, data, offset, limit, count } =
      await this.subscriptionService.findAll({
        owner,
        action: 'findAll',
        payload: { ...query },
      });

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
    const { error, count } = await this.subscriptionService.getCount({
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
   * Find one entity document
   */
  @Get('find')
  @ApiOperation({ summary: `Find one ${entity}` })
  @ResponseGetOne(SubscriptionEntity)
  async findOne(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query() query: ApiQueryGetOne,
  ) {
    const { error, data } = await this.subscriptionService.findOne({
      owner,
      action: 'findOne',
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
    return Result(res, { data: { [entity]: data }, message: 'Ok' });
  }

  /**
   * Get an entity document by using id
   */
  @Get(':id')
  @ApiOperation({ summary: `Find ${entity} using id` })
  @ResponseGetOne(SubscriptionEntity)
  async findById(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') id: number,
    @Query() query: any,
  ) {
    const { error, data } = await this.subscriptionService.findById({
      owner,
      action: 'findById',
      id: +id,
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
    return Result(res, { data: { [entity]: data }, message: 'Ok' });
  }

  /**
   * Delete an entity document by using id
   */
  @Delete(':id')
  @ApiOperation({ summary: `Delete ${entity} using id` })
  @ResponseDeleted(SubscriptionEntity)
  async delete(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('id') id: number,
    @Query() query: any,
  ) {
    const { error, data } = await this.subscriptionService.delete({
      owner,
      action: 'delete',
      id: +id,
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
    return Result(res, { data: { [entity]: data }, message: 'Deleted' });
  }
}
