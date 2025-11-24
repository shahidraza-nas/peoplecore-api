import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionService } from '../subscription.service';
import { SubscriptionStatus } from '../entities/subscription.entity';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { APPEVENTS } from 'src/constants';
import { Job } from 'src/core/core.job';
import { Op } from 'sequelize';

@Injectable()
export class SubscriptionExpiryCron {
    private logger: Logger = new Logger(`Cron - ${SubscriptionService.name}`);

    constructor(
        private subscriptionService: SubscriptionService,
        private msClient: MsClientService,
    ) { }

    /**
     * Check for expiring subscriptions and send email notifications
     * Runs daily at midnight
     * Finds subscriptions expiring within 7 days
     */
    @Cron('0 0 0 * * *')
    async sendExpirationNotifications() {
        this.logger.log('Subscription expiry cron started...');

        try {
            const today = new Date();
            const notificationDate = new Date(today);
            notificationDate.setDate(notificationDate.getDate() + 7);
            const { data: subscriptions, error } =
                await this.subscriptionService.findAll({
                    owner: { id: 0 } as any,
                    action: 'findAll',
                    payload: {
                        where: {
                            current_period_end: {
                                $gte: today,
                                $lte: notificationDate,
                            },
                            status: SubscriptionStatus.ACTIVE,
                            expiry_notification_sent: false, // Only send once
                        },
                        populate: ['user'],
                    },
                });
            if (error) {
                this.logger.error(`Error fetching subscriptions - ${error.message || error}`);
                return;
            }
            if (!subscriptions || subscriptions.length === 0) {
                this.logger.log('No subscriptions expiring within 7 days');
                return;
            }
            this.logger.log(`Found ${subscriptions.length} subscriptions expiring within 7 days`);
            for (const subscription of subscriptions) {
                const subscriptionData = subscription.toJSON ? subscription.toJSON() : subscription;
                const user = subscriptionData.user;
                if (!user || !user.email) {
                    this.logger.warn(`Skipping subscription ${subscriptionData.id} - no user email`);
                    continue;
                }
                const daysRemaining = Math.ceil(
                    (new Date(subscriptionData.current_period_end).getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                await this.msClient.executeJob(
                    APPEVENTS.NOTIFICATION,
                    new Job({
                        action: 'send',
                        payload: {
                            template: 'subscription-expiring',
                            variables: {
                                name: user.name || user.first_name || 'User',
                                daysRemaining: String(daysRemaining),
                                expiryDate: new Date(subscriptionData.current_period_end).toLocaleDateString(),
                                planType: subscriptionData.plan_type,
                                renewUrl: `${process.env.FRONTEND_URL}/subscription/renew`,
                                COMPANY_NAME: process.env.APP_ID || 'PeopleCore',
                            },
                            user_id: subscriptionData.user_id,
                        },
                    }),
                );
                
                // Mark notification as sent to prevent duplicates
                await this.subscriptionService.update({
                    owner: { id: 0 } as any,
                    action: 'update',
                    id: subscriptionData.id,
                    body: { expiry_notification_sent: true },
                    payload: {},
                });
                
                this.logger.log(`Expiry notification sent to ${user.email} (${daysRemaining} days remaining)`);
            }
            this.logger.log('Subscription expiry cron completed successfully!');
        } catch (error) {
            this.logger.error(`Unexpected error - ${error.message || error}`);
        }
    }

    /**
     * Mark expired subscriptions as EXPIRED
     * Runs daily at 1 AM (backup for opportunistic expiration in checkChatAccess)
     */
    @Cron('0 1 0 * * *')
    async markExpiredSubscriptions() {
        this.logger.log('Mark expired subscriptions cron started...');

        try {
            const today = new Date();

            const { error } = await this.subscriptionService.$db.updateBulkRecords({
                owner: { id: 0 } as any,
                options: {
                    where: {
                        current_period_end: {
                            [Op.lt]: today,
                        },
                        status: SubscriptionStatus.ACTIVE,
                    },
                },
                body: {
                    status: SubscriptionStatus.EXPIRED,
                },
            });

            if (error) {
                this.logger.error(`Error marking expired subscriptions - ${error.message || error}`);
                return;
            }

            this.logger.log('Mark expired subscriptions cron completed successfully!');
        } catch (error) {
            this.logger.error(`Unexpected error - ${error.message || error}`);
        }
    }
}
