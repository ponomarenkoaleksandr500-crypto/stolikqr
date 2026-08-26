import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateIngredientDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  removable?: boolean;
}

export class UpdateIngredientDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  name?: LocalizedTextDto;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  removable?: boolean;
}
