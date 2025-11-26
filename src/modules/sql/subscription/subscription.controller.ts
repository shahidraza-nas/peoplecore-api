import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
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
import { Public } from 'src/core/decorators/public.decorator';
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
   * Create Stripe checkout session for recurring subscription
   * Redirects user to Stripe Checkout page to subscribe (monthly or yearly)
   * Subscription is created automatically via webhook (customer.subscription.created)
   */
  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create checkout session for recurring subscription' })
  @ResponseCreated(Object)
  async createCheckoutSession(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    try {
      console.log('[Checkout Request]', {
        userId: owner.id,
        email: owner.email,
        dto: createCheckoutDto,
      });

      const { error, data: session } = await this.subscriptionService.createCheckoutSession(
        owner,
        createCheckoutDto,
      );

      if (error) {
        console.error('[Checkout Error]', {
          message: error.message,
          type: error.constructor.name,
          stack: error.stack?.split('\n')[0],
        });
        return ErrorResponse(res, { error, message: error.message });
      }

      if (!session || !session.url || !session.id) {
        console.error('[Checkout Error] Invalid session object:', session);
        return ErrorResponse(res, {
          error: new Error('Invalid session returned from Stripe'),
          message: 'Failed to create checkout session - invalid response',
        });
      }

      console.log('[Checkout Success]', {
        sessionId: session.id,
        url: session.url.substring(0, 60) + '...',
      });

      return Created(res, {
        data: { sessionUrl: session.url, sessionId: session.id },
        message: 'Checkout session created',
      });
    } catch (error) {
      console.error('[Checkout Fatal Error]', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      return ErrorResponse(res, {
        error,
        message: error.message || 'Unexpected error creating checkout session',
      });
    }
  }

  /**
    * Check user's subscription status
    */
  @Get('status')
  @ApiOperation({ summary: 'Get current subscription status' })
  @ResponseGetOne(Object)
  async getStatus(@Res() res: Response, @Owner() owner: OwnerDto) {
    try {
      const hasAccess = await this.subscriptionService.checkChatAccess(owner);
      const subscription = await this.subscriptionService.getUserSubscription(owner);

      /**
       * Structured response with computed metadata
       */
      const responseData = {
        subscription: subscription || null,
        access: {
          hasAccess,
          isActive: subscription?.status === 'active' && !subscription?.cancel_at_period_end,
          isCancelling: subscription?.cancel_at_period_end === true,
        },
        billing: subscription ? {
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          cancelledAt: subscription.cancelled_at || null,
        } : null,
      };

      return Result(res, {
        data: responseData,
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
    const { error, data, count } = await this.subscriptionService.getUserHistory(owner, query);

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
   * Query params:
   * - immediate: true = cancel immediately, false = cancel at period end (default)
   */
  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel active subscription' })
  async cancelSubscription(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Query('immediate') immediate?: string,
  ) {
    console.log('[Cancel Request] immediate query param:', immediate, 'type:', typeof immediate);
    try {
      const cancelImmediately = immediate === 'true';
      console.log('[Cancel] cancelImmediately:', cancelImmediately);
      const { error, data } = await this.subscriptionService.cancelUserSubscription(
        owner,
        cancelImmediately,
      );

      if (error) {
        return ErrorResponse(res, { error, message: error.message });
      }

      const message = cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of billing period';

      return Result(res, {
        data: { subscription: data },
        message,
      });
    } catch (error) {
      return ErrorResponse(res, { error, message: error.message });
    }
  }

  /**
   * Handle Stripe webhook events
   * This endpoint receives and processes events from Stripe
   * 
   * Supported Events:
   * - customer.subscription.created: New subscription created
   * - customer.subscription.updated: Subscription status changed (renewals, cancellations, plan changes)
   * - customer.subscription.deleted: Subscription permanently deleted
   * - invoice.paid: Successful recurring payment
   * - invoice.payment_failed: Failed recurring payment attempt
   * - charge.refunded: Payment refunded from Stripe dashboard
   * - charge.dispute.created: Customer disputed payment (chargeback)
   * - payment_intent.payment_failed: Payment intent failed
   */
  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      /**
       * Get raw body for signature verification
       */
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

      if (!signature) {
        return ErrorResponse(res, {
          error: new Error('Missing stripe-signature header'),
          message: 'Webhook signature required',
        });
      }

      /**
       * Process the webhook event
       */
      const { error } = await this.subscriptionService.handleStripeWebhook(rawBody, signature);

      if (error) {
        console.error('Webhook processing error:', error.message);
        /**
         * Still return 200 to prevent Stripe from retrying
         * Log the error for investigation
         */
        return Result(res, {
          data: { received: true, error: error.message },
          message: 'Webhook received but processing failed',
        });
      }

      /**
       * Return 200 to acknowledge receipt
       */
      return Result(res, {
        data: { received: true },
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      console.error('Webhook error:', error.message);
      /**
       * Return 200 even on error to prevent Stripe retry loop
       * since the error is likely unrecoverable (bad signature, etc.)
       */
      return Result(res, {
        data: { received: false, error: error.message },
        message: `Webhook Error: ${error.message}`,
      });
    }
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
   * Update an entity document by using uid
   */
  @Put(':uid')
  @ApiOperation({ summary: `Update ${entity} using uid` })
  @ResponseUpdated(SubscriptionEntity)
  async update(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('uid') uid: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Query() query: ApiQueryUpdate,
  ) {
    const { error, data } = await this.subscriptionService.update({
      owner,
      action: 'update',
      uid,
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
   * Get an entity document by using uid
   */
  @Get(':uid')
  @ApiOperation({ summary: `Find ${entity} using uid` })
  @ResponseGetOne(SubscriptionEntity)
  async findById(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('uid') uid: string,
    @Query() query: any,
  ) {
    const { error, data } = await this.subscriptionService.findById({
      owner,
      action: 'findById',
      uid,
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
   * Delete an entity document by using uid
   */
  @Delete(':uid')
  @ApiOperation({ summary: `Delete ${entity} using uid` })
  @ResponseDeleted(SubscriptionEntity)
  async delete(
    @Res() res: Response,
    @Owner() owner: OwnerDto,
    @Param('uid') uid: string,
    @Query() query: any,
  ) {
    const { error, data } = await this.subscriptionService.delete({
      owner,
      action: 'delete',
      uid,
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
