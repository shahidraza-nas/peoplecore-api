import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { OWNER_INCLUDE_ATTRIBUTES_KEY } from 'src/core/decorators/sql/owner-attributes.decorator';
import { OWNER_INCLUDE_POPULATES_KEY } from 'src/core/decorators/sql/owner-populates.decorator';
import { CachingService } from 'src/core/modules/caching/caching.service';
import { UserService } from '../../../user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private _config: ConfigService,
    private _user: UserService,
    private _cache: CachingService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: _config.get('jwt').secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req.headers['authorization'];
    if (
      await this._cache.isBlackListed({ sessionId: payload.sessionId, token })
    ) {
      throw new UnauthorizedException();
    }
    const includedAttributes = req[OWNER_INCLUDE_ATTRIBUTES_KEY];
    const includedPopulates = req[OWNER_INCLUDE_POPULATES_KEY];
    const { error, data } = await this._user.$db.findRecordById({
      id: payload.userId,
      options: {
        attributes: { include: includedAttributes },
        include: includedPopulates,
        allowEmpty: true,
      },
    });
    if (!!error || !data || !data.getDataValue('active')) {
      throw new UnauthorizedException();
    }
    // Include OWNER_INCLUDE_ATTRIBUTES_KEY fields in the returned user object
    const includedAttributeValues = {};
    if (includedAttributes && includedAttributes.length > 0) {
      for (const attr of includedAttributes) {
        includedAttributeValues[attr] = data.getDataValue(attr);
      }
    }
    return { ...data.toJSON(), ...payload, ...includedAttributeValues };
  }
}
