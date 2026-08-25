import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGuestSessionDto {
  @IsString()
  @IsNotEmpty()
  qrToken!: string;

  @IsString()
  @IsNotEmpty()
  deviceToken!: string;
}
