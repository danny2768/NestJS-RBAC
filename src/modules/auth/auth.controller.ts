import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationService } from './services/authentication.service';
import { RegisterUserDto } from './dtos/register-user.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginUserDto } from './dtos/login-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authenticationService.register(registerUserDto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authenticationService.login(loginUserDto);
  }

  @Get('refresh-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Refresh the JWT token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  refreshToken() {
    return this.authenticationService.refreshToken();
  }
}
