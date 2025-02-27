import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  @ApiProperty({
    example: 'email@emai.com',
    description: 'The email of the User',
  })
  email: string;

  @IsString()
  @ApiProperty({
    example: 'Pass123.',
    description: 'The password of the user',
  })
  password: string;
}
