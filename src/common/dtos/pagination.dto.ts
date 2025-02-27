import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @IsNumber()
  @Min(1)
  @ApiProperty({
    example: 1,
    description: 'The page number',
    default: 1,
    required: false,
  })
  page: number = 1;

  @IsOptional()
  @IsPositive()
  @IsNumber()
  @Min(1)
  @ApiProperty({
    example: 10,
    description: 'The limit of items per page',
    default: 10,
    required: false,
  })
  limit: number = 10;

  @IsOptional()
  @IsIn(['id', 'createdAt', 'updatedAt'])
  @ApiProperty({
    example: 'createdAt',
    description: 'Sort by field',
    enum: ['id', 'createdAt', 'updatedAt'],
    default: 'id',
    required: false,
  })
  sortBy: 'id' | 'createdAt' | 'updatedAt' = 'id';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @ApiProperty({
    example: 'desc',
    description: 'Sort order (asc or desc)',
    enum: ['asc', 'desc'],
    default: 'asc',
    required: false,
  })
  sortOrder: 'asc' | 'desc' = 'asc';
}
