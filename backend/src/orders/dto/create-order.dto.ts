import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  // Flat list of chosen ModifierChoice ids across all of the dish's groups —
  // the server looks each one up for real and never trusts a client-sent
  // name or price for it.
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modifierChoiceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedIngredientIds?: string[];
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  guestSessionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
