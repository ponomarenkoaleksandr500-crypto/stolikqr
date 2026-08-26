import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateModifierGroupDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsBoolean()
  @IsOptional()
  multiple?: boolean;
}

export class UpdateModifierGroupDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  name?: LocalizedTextDto;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsBoolean()
  @IsOptional()
  multiple?: boolean;
}
