import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class UpdateDishDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  name?: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  description?: LocalizedTextDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsString()
  @IsOptional()
  gradient?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;
}
