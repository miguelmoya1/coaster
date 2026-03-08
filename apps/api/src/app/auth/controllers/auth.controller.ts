import { LoginDto } from '@coaster/interfaces';
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../../core';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/pin')
  async loginWithPin(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto.email, loginDto.pin);
  }
}
