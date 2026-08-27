import { Allow, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HoldDto {
  @ApiProperty()
  @IsString()
  dogId!: string;

  @ApiProperty()
  @IsString()
  playGroupId!: string;

  @ApiProperty()
  @IsString()
  visitDate!: string;

  @ApiProperty()
  @IsString()
  dropOffSlotId!: string;

  @ApiProperty()
  @IsString()
  pickUpSlotId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonIds?: string[];
}

export class DogDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsIn(['S', 'M', 'L'])
  size!: 'S' | 'M' | 'L';

  @ApiProperty()
  @Allow()
  vaccines!: { rabiesUntil: string; polyvalentUntil: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['social', 'shy', 'playful'])
  temperament?: 'social' | 'shy' | 'playful';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class CodeDto {
  @ApiProperty()
  @IsString()
  codeOrUrl!: string;
}

export class ReviewDto {
  @ApiProperty()
  @IsString()
  bookingId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class YardPatchDto {
  @ApiProperty()
  @IsIn(['open', 'limited', 'closed'])
  status!: 'open' | 'limited' | 'closed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  capacityOverride?: number;
}
