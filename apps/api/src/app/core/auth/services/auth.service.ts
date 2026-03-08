import { asUserId, asUserRole, AuthResponse, User } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CryptoService } from '../../crypto/crypto.service';
import { AuthRepository } from '../data-access/auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly _authRepository: AuthRepository,
    private readonly _cryptoService: CryptoService,
    private readonly _jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const user = await this.#validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    return this.#prepareSignIn(user);
  }

  async #prepareSignIn(user: User): Promise<AuthResponse> {
    const payload = { email: user.email, sub: user.id, id: user.id };
    return {
      user,
      accessToken: this._jwtService.sign(payload),
    };
  }

  async #validateUser(email: string, password: string): Promise<User | null> {
    const user = await this._authRepository.findUserForAuthentication(email);

    if (user && (await this._cryptoService.compare(password, user.pin))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pin, ...userWithoutPin } = user;

      return {
        ...userWithoutPin,
        id: asUserId(userWithoutPin.id),
        role: asUserRole(user.role),
      };
    }

    return null;
  }
}
