import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class UpdateCategoryDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  @IsOptional()
  name?: LocalizedTextDto;
}
