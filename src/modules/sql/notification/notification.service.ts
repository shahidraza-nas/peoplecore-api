import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { handlebars } from 'hbs';
import { join } from 'path';
import { Job, JobResponse } from 'src/core/core.job';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { TemplateService } from '../template/template.service';
import { UserService } from '../user/user.service';
import { APPEVENTS } from 'src/constants';
import { LoginLogService } from 'src/modules/mongo/login-log/login-log.service';

@Injectable()
export class NotificationService {
  private emailTemplate: HandlebarsTemplateDelegate;

  constructor(
    private userService: UserService,
    private templateService: TemplateService,
    private msClient: MsClientService,
    private config: ConfigService,
    private loginLogService: LoginLogService
  ) {
    try {
      const template = readFileSync(
        join(__dirname, '../src', 'views/template.hbs'),
        'utf8',
      );
      this.emailTemplate = handlebars.compile(template);
    } catch {
      this.emailTemplate = handlebars.compile('<div>{{{content}}}</div>');
    }
  }

  /**
 * send
 * @function function send push notification
 * @param {object} job - mandatory - a job object representing the job information
 * @return {JobResponse}
 */
  async sendPushNotification(job: Job): Promise<JobResponse> {
    try {
      const { owner, payload } = job;

      if (!payload.toUserId)
        return {
          error: 'Error calling sendPushNotification - toUserId is missing',
        };

      const [{ data: sessions, error }] = await Promise.all([
        this.loginLogService.findAll({
          action: 'find all sessions',
          owner,
          payload: {
            where: {
              user_id: payload.toUserId,
              active: true,
            },
          },
        }),
      ]);

      if (error || !sessions || sessions.length === 0)
        return { error: 'To user sessions not found!' };

      // console.log(JSON.stringify(sessions));
      const tokens = [
        ...new Set(
          sessions
            .filter((item) => item.info && item.info.fcm)
            .map((item) => item.info.fcm),
        ),
      ];

      console.log({ payload, tokens });

      if (tokens.length === 0) throw Error('Tokes not found!');

      this.msClient.executeJob(
        APPEVENTS.FIREBASE_NOTIFICATION,
        new Job({
          action: 'sendMulticast',
          owner,
          app: process.env.APP_ID,
          payload: {
            tokens,
            notification: {
              title: payload.title,
              body: payload.body,
              icon: '/images/icon-192x192.png',
              actions: [
                {
                  action: 'open_chat',
                  title: 'Open Chat'
                }
              ]
            },
            data: {
              ...payload.data,
              url: payload.data?.chatUid ? `/chat/${payload.data.chatUid}` : undefined
            },
            // android: {
            //   notification: {
            //     sound: 'default',
            //     color: '#ff0000', // notification icon color in Android
            //     priority: 'high',
            //   },
            // },
            // apns: {
            //   payload: {
            //     aps: {
            //       alert: {
            //         title: payload.title,
            //         body: payload.body,
            //       },
            //       sound: 'default',
            //       badge: payload.badge || 0,
            //     },
            //   },
            //   headers: {
            //     'apns-priority': '10', // immediate delivery
            //     // other iOS-specific headers
            //   },
            // },
          },
        }),
      );
      return { error: false };
    } catch (error) {
      console.log(error);
      return { error };
    }
  }

  /**
   * send
   * @function function send notification
   * @param {object} job - mandatory - a job object representing the job information
   * @return {JobResponse}
   */
  async send(job: Job): Promise<JobResponse> {
    const payload = job.payload;
    const getTemplate = await this.templateService.$db.findOneRecord({
      options: {
        where: {
          name: payload.template,
        },
      },
    });

    if (getTemplate.error) {
      return { error: getTemplate.error };
    }

    const template = getTemplate.data,
      variables: Record<string, string> = payload.variables || {};

    let email_subject: string = template.getDataValue('email_subject') || '',
      email_body: string = template.getDataValue('email_body') || '',
      sms_body: string = template.getDataValue('sms_body') || '',
      users: any[] = payload.users || [];

    for (const key in variables) {
      if (Object.prototype.hasOwnProperty.call(variables, key)) {
        email_subject = email_subject.split(`##${key}##`).join(variables[key]);
        email_body = email_body.split(`##${key}##`).join(variables[key]);
        sms_body = sms_body.split(`##${key}##`).join(variables[key]);
      }
    }

    if (payload.user_id) {
      const getUser = await this.userService.$db.findRecordById({
        id: payload.user_id,
        options: {
          attributes: [
            'id',
            'name',
            'email',
            'phone',
            'phone_code',
            'send_email',
            'send_sms',
          ],
        },
      });

      if (getUser.error) {
        return { error: getUser.error };
      }

      users.push(getUser.data.toJSON());
    }

    if (payload.user_where) {
      const getUsers = await this.userService.$db.getAllRecords({
        options: {
          limit: -1,
          pagination: false,
          where: payload.user_where,
          attributes: [
            'id',
            'name',
            'email',
            'phone',
            'phone_code',
            'send_email',
            'send_sms',
          ],
        },
      });

      if (getUsers.error) {
        return { error: getUsers.error };
      }

      const allUsers = getUsers.data.map((user) => user.toJSON());
      users = [...users, ...allUsers];
    }

    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      const _email_subject = email_subject
        .split(`##TO_NAME##`)
        .join(user.name)
        .split(`##TO_EMAIL##`)
        .join(user.email);
      const _email_body = email_body
        .split(`##TO_NAME##`)
        .join(user.name)
        .split(`##TO_EMAIL##`)
        .join(user.email);

      const _email_template = this.emailTemplate({
        content: _email_body,
        logo: this.config.get('cdnLocalURL') + 'assets/logo.png',
        year: new Date().getFullYear(),
      });

      if (
        !!template.getDataValue('send_email') &&
        (!!payload.skipUserConfig || !!user.send_email)
      ) {
        await this.msClient.executeJob(
          'controller.email',
          new Job({
            action: 'sendMail',
            payload: {
              to: user.email,
              subject: _email_subject,
              html: _email_template,
            },
          }),
        );
      }
    }

    return { error: false };
  }
}
