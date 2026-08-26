import type { $Enums } from '../../generated/prisma/client';

export type StaffRoleValue = $Enums.StaffRole;

export interface JwtPayload {
  sub: string; // StaffUser.id
  restaurantId: string;
  email: string;
  role: StaffRoleValue;
}

/** Attached to Request.user by JwtStrategy - a minimal, already-verified identity. */
export interface AuthenticatedStaff {
  id: string;
  restaurantId: string;
  email: string;
  role: StaffRoleValue;
}

export interface StaffDto {
  id: string;
  name: string;
  email: string;
  restaurantId: string;
  role: StaffRoleValue;
}

export interface LoginResponseDto {
  accessToken: string;
  staff: StaffDto;
}
