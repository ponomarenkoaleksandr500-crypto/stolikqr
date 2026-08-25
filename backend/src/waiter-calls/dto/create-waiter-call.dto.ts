import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWaiterCallDto {
  @IsString()
  @IsNotEmpty()
  guestSessionId!: string;

  @IsString()
  @IsNotEmpty()
  reasonKey!: string;
}
