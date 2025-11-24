import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
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
        const hasAccess = await this.subscriptionService.checkChatAccess(user.id);

        if (!hasAccess) {
            throw new ForbiddenException('Active subscription required to access chat');
        }

        return true;
    }
}
