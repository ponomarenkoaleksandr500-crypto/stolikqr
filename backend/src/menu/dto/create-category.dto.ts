import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class CreateCategoryDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name!: LocalizedTextDto;
}
