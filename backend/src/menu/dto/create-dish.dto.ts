import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateDishDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  description?: LocalizedTextDto;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

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
