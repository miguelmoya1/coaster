import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly _configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: _configService.get<string>('JWT_SECRET'),
    });
  }

  public validate(payload: unknown) {
    if (!payload['sub'] || !payload['email'] || !payload['role']) {
      throw new UnauthorizedException();
    }

    return {
      id: payload['sub'],
      email: payload['email'],
      role: payload['role'],
    };
  }
}
