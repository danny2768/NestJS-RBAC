import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  @ApiProperty({ example: 'Admin', description: 'The name of the Role' })
  readonly name: string;

  @IsNumber()
  @IsInt()
  @Min(1)
  @IsPositive()
  @ApiProperty({
    example: 1,
    description: 'The hierarchy of the Role',
  })
  readonly hierarchy: number;

  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of permission IDs assigned to this role',
    type: [Number],
  })
  readonly permissionIds: number[];
}
