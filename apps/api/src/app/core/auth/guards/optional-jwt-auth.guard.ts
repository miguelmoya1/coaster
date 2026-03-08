import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(error: Error, user: TUser) {
    if (error || !user) {
      return null;
    }

    return user;
  }
}
