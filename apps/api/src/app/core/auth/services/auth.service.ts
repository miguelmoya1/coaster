import { asUserId, asUserRole, AuthResponse, User } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
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

  public async validateUser(
    email: string,
    password: string,
  ): Promise<User | null> {
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

  public async login(user: User): Promise<AuthResponse> {
    const payload = { email: user.email, sub: user.id, id: user.id };
    return {
      user,
      accessToken: this._jwtService.sign(payload),
    };
  }
}
