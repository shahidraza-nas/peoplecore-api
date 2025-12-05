import { Injectable, CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionService } from '../subscription/subscription.service';
import { Role } from '../user/role.enum';


@Injectable()
export class ChatAccessGuard implements CanActivate {
    constructor(private subscriptionService: SubscriptionService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        /**
         * Admin always has access
         */
        if (user.role === Role.Admin) {
            return true;
        }

        /**
         * Check if user has active subscription
         */
        const hasAccess = await this.subscriptionService.checkChatAccess(user);

        if (!hasAccess) {
            throw new HttpException({
                statusCode: HttpStatus.FORBIDDEN,
                error: 'SUBSCRIPTION_REQUIRED',
                message: 'Active subscription required to access chat features'
            }, HttpStatus.FORBIDDEN);
        }

        return true;
    }
}
