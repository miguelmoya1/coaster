import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('firebase-jwt') {
  override handleRequest<TUser>(error: Error, user: TUser) {
    if (error || !user) {
      return null;
    }

    return user;
  }
}
