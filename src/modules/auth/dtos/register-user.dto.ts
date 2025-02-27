import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @ApiProperty({ example: 'John', description: 'The first name of the User' })
  readonly firstName: string;

  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @ApiProperty({ example: 'Doe', description: 'The last name of the User' })
  readonly lastName: string;

  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  @ApiProperty({
    example: 'email@email.com',
    description: 'The email of the User',
  })
  readonly email: string;

  @IsStrongPassword()
  @ApiProperty({ example: 'Pass123.', description: 'The password of the User' })
  readonly password: string;
}
