import { IsBoolean } from 'class-validator';

export class UpdateDishAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
