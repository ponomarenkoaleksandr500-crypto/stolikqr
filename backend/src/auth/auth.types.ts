export interface JwtPayload {
  sub: string; // StaffUser.id
  restaurantId: string;
  email: string;
}

/** Attached to Request.user by JwtStrategy - a minimal, already-verified identity. */
export interface AuthenticatedStaff {
  id: string;
  restaurantId: string;
  email: string;
}

export interface StaffDto {
  id: string;
  name: string;
  email: string;
  restaurantId: string;
}

export interface LoginResponseDto {
  accessToken: string;
  staff: StaffDto;
}
