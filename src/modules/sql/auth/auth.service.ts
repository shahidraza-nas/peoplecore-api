import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as moment from 'moment-timezone';
import { Op } from 'sequelize';
import { Job, JobResponse } from 'src/core/core.job';
import { generateHash, otp } from 'src/core/core.utils';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { CachingService } from 'src/core/modules/caching/caching.service';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { SessionService } from 'src/core/modules/session/session.service';
import { LoginLog } from 'src/modules/mongo/login-log/entities/login-log.entity';
import { LoginLogService } from 'src/modules/mongo/login-log/login-log.service';
import { OtpSessionType } from 'src/modules/mongo/otp-session/entities/otp-session.entity';
import { OtpSessionService } from 'src/modules/mongo/otp-session/otp-session.service';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { ChatService } from '../chat/chat.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { TokenAuthDto } from './strategies/token/token-auth.dto';
import { APPEVENTS } from 'src/constants';

export interface AuthResponse {
  error?: any;
  user?: User;
}

@Injectable()
export class AuthService {
  constructor(
    private sessionService: SessionService,
    private userService: UserService,
    private loginLogService: LoginLogService,
    private otpSessionService: OtpSessionService,
    private msClient: MsClientService,
    private _cache: CachingService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  async createSession(owner: OwnerDto, info: any): Promise<any> {
    try {
      const refreshToken = randomBytes(40).toString('hex');
      const { error, data } = await this.loginLogService.create({
        action: 'create',
        owner,
        body: {
          token: refreshToken,
          token_expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          user_id: owner.id,
          info,
        },
      });
      if (error) return { error };
      const {
        token,
        tokenExpiry,
        error: tokenError,
      } = this.sessionService.createToken({
        sessionId: data._id,
        userId: owner.id,
      });
      if (tokenError) {
        return { error: tokenError };
      }
      
      // Get unread messages count
      const unreadMessagesCount = await this.chatService.getUnreadMessagesCount(owner.id);
      
      return {
        error: false,
        data: {
          token,
          token_expiry: tokenExpiry,
          refresh_token: refreshToken,
          user: { ...owner, unread_messages_count: unreadMessagesCount },
          session_id: data._id,
        },
      };
    } catch (error) {
      return { error };
    }
  }

  async createUserSession(
    userId: number,
    isAdmin: boolean,
    info: any,
  ): Promise<any> {
    try {
      const userWhere: any = { id: userId };
      if (isAdmin) {
        userWhere.role = { [Op.ne]: 'Admin' };
      }
      const { error, data: user } = await this.userService.findOne({
        payload: { where: userWhere, allowEmpty: false },
      });
      if (error) {
        return { error: 'Account does not exist' };
      } else {
        if (!user.getDataValue('active')) {
          return { error: 'Account is inactive' };
        }
        const refreshToken = randomBytes(40).toString('hex');
        const { error, data } = await this.loginLogService.create({
          action: 'create',
          body: {
            token: refreshToken,
            token_expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            user_id: user.getDataValue('id'),
            info,
          },
        });
        if (error) return { error };
        const {
          token,
          tokenExpiry,
          error: tokenError,
        } = this.sessionService.createToken({ sessionId: data._id, userId });
        if (tokenError) {
          return { error: tokenError };
        }
        
        // Get unread messages count
        const unreadMessagesCount = await this.chatService.getUnreadMessagesCount(userId);
        const userJson = user.toJSON();
        
        return {
          error: false,
          data: {
            token,
            token_expiry: tokenExpiry,
            refresh_token: refreshToken,
            user: { ...userJson, unread_messages_count: unreadMessagesCount },
            session_id: data._id,
          },
        };
      }
    } catch (error) {
      return { error };
    }
  }

  async createOtpSession(user: OwnerDto, payload?: any): Promise<JobResponse> {
    const { error, data } = await this.otpSessionService.create({
      body: {
        user_id: user.id,
        otp: otp(),
        type: OtpSessionType.Login,
        expire_at: new Date(Date.now() + 15 * 60 * 1000),
        payload,
      },
    });
    return { error, data };
  }

  getNewToken(
    tokens: TokenAuthDto,
    session: LoginLog,
  ): { error?: any; data?: any } {
    try {
      const { decoded, error } = this.sessionService.decodeToken(tokens.token);
      if (error) {
        return { error };
      }
      if (
        decoded.sessionId !== String(session._id) ||
        decoded.userId !== session.user_id
      ) {
        return { error: 'Invalid token' };
      }

      const { token, tokenExpiry } = this.sessionService.createToken({
        sessionId: session._id,
        userId: session.user_id,
      });

      return { error: false, data: { token, token_expiry: tokenExpiry } };
    } catch (error) {
      return { error };
    }
  }

  async updateSessionInfo(owner: OwnerDto, info: any): Promise<any> {
    try {
      const { error, data } = await this.loginLogService.$db.findRecordById({
        id: owner.sessionId,
      });
      if (error) throw error;
      data.info = { ...data.info, ...info };
      await data.save();
      return { error: false, data };
    } catch (error) {
      return { error };
    }
  }

  async clearSession(owner: OwnerDto, token: string) {
    const { exp, sessionId } = owner;
    await this.loginLogService.update({
      action: 'update',
      id: sessionId,
      body: { logout_at: moment().toDate(), active: false },
    });

    const authExp = new Date(exp * 1000);
    authExp.setHours(23, 59, 59, 999);
    const authRedisExpiry = authExp.getTime() - new Date().getTime();
    await this._cache.addToBlackList({
      expireAt: Math.floor(authRedisExpiry),
      token,
      sessionId,
    });
  }

  async verifyEmail(email: string): Promise<JobResponse> {
    const { error, data } = await this.userService.$db.findOneRecord({
      options: { where: { email }, allowEmpty: true },
    });
    if (error) {
      return { error };
    } else if (data) {
      if (!data.getDataValue('active')) {
        return {
          error:
            'Your account is currently inactive. Please contact the administrator for assistance.',
        };
      }
      return { error: false, data };
    } else {
      return { error: 'No account found with that email address.' };
    }
  }

  async forgotOtp(user: User): Promise<JobResponse> {
    const { error, data } = await this.otpSessionService.create({
      body: {
        user_id: user.id,
        otp: otp(),
        type: OtpSessionType.Forgot,
        expire_at: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await this.msClient.executeJob(
      APPEVENTS.NOTIFICATION,
      new Job({
        action: 'send',
        payload: {
          user_id: user.id,
          template: 'forgot_password',
          variables: { OTP: data.otp },
        },
      }),
    );
    return { error, data };
  }

  async verifyOtp(body: VerifyOtpDto): Promise<JobResponse> {
    const { error, data } = await this.otpSessionService.findById({
      id: body.session_id,
    });
    if (error) {
      return {
        error:
          'The code you entered is no longer valid. Please generate a new code to continue.',
        errorCode: 403,
      };
    }
    if (
      !!data.verified ||
      moment(data.expire_at).diff(moment(), 'seconds') <= 0
    ) {
      return {
        error:
          'The code you entered is no longer valid. Please generate a new code to continue.',
        errorCode: 403,
      };
    }
    if (data.retry_limit <= 0) {
      return {
        error: 'Maximum number of attempts exceeded. Please try again later.',
        errorCode: 403,
      };
    }
    if (data.otp !== body.otp) {
      try {
        data.retry_limit--;
        await data.save();
        return { error: 'Invalid verification code. Please try again.' };
      } catch (error) {
        return { error };
      }
    }
    try {
      data.verified = true;
      await data.save();
      return { error: false, data };
    } catch (error) {
      return { error };
    }
  }

  async sendOtp(body: SendOtpDto): Promise<JobResponse> {
    const { error, data } = await this.otpSessionService.findById({
      id: body.session_id,
    });
    if (error) {
      return { error: 'Invalid session', errorCode: 403 };
    }
    if (
      !!data.verified ||
      moment(data.expire_at).diff(moment(), 'seconds') <= 0
    ) {
      return {
        error:
          'The code you entered is no longer valid. Please generate a new code to continue.',
        errorCode: 403,
      };
    }
    if (data.resend_limit <= 0) {
      return {
        error: 'Maximum number of attempts exceeded. Please try again later.',
      };
    }
    try {
      // data.expire_at = moment().add(15, 'minutes');
      data.resend_limit--;
      await data.save();
    } catch (error) {
      return { error };
    }

    await this.msClient.executeJob(
      'controller.notification',
      new Job({
        action: 'send',
        payload: {
          user_id: data.user_id,
          template: 'forgot_password',
          variables: { OTP: data.otp },
        },
      }),
    );
    return { error: false, data };
  }

  async resetPassword(body: ResetPasswordDto): Promise<JobResponse> {
    const otpSession = await this.otpSessionService.findById({
      id: body.session_id,
    });
    if (!!otpSession.error || !otpSession.data.verified) {
      return { error: 'Invalid session', errorCode: 403 };
    }
    if (moment(otpSession.data.expire_at).diff(moment(), 'seconds') <= 0) {
      return { error: 'Session expired', errorCode: 403 };
    }
    const userUpdate = await this.userService.update({
      id: otpSession.data.user_id,
      body: { password: await generateHash(body.password) },
    });
    if (userUpdate.error) {
      return { error: 'Unable to change password, Please try again' };
    }
    await this.otpSessionService.delete({ id: body.session_id });
    await this.msClient.executeJob(
      'controller.notification',
      new Job({
        action: 'send',
        payload: {
          user_id: otpSession.data.user_id,
          template: 'change_password',
          variables: {
            TIMESTAMP: moment()
              .tz('America/New_York')
              .format('MMM DD, YYYY hh:mm A (z)'),
          },
        },
      }),
    );
    return { error: false };
  }
}
