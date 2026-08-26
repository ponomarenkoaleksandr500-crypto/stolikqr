import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateModifierChoiceDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto;

  @IsNumber()
  @IsOptional()
  priceDelta?: number;

  @IsBoolean()
  @IsOptional()
  exclusive?: boolean;
}

export class UpdateModifierChoiceDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  name?: LocalizedTextDto;

  @IsNumber()
  @IsOptional()
  priceDelta?: number;

  @IsBoolean()
  @IsOptional()
  exclusive?: boolean;
}
