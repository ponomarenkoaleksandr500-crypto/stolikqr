import { IsNotEmpty, IsString } from 'class-validator';

/** uk/en pair - mirrors the client's Record<Locale, string> shape, matches every Json name/description column. */
export class LocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  uk!: string;

  @IsString()
  @IsNotEmpty()
  en!: string;
}
