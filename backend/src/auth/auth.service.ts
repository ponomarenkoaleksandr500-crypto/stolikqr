import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthenticatedStaff,
  JwtPayload,
  LoginResponseDto,
  StaffDto,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponseDto> {
    const staff = await this.prisma.staffUser.findUnique({ where: { email } });
    // Same generic message whether the email doesn't exist or the password is
    // wrong - never reveal which one it was.
    if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: staff.id,
      restaurantId: staff.restaurantId,
      email: staff.email,
      role: staff.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, staff: this.toStaffDto(staff) };
  }

  async me(authenticated: AuthenticatedStaff): Promise<StaffDto> {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: authenticated.id },
    });
    if (!staff)
      throw new UnauthorizedException('Staff account no longer exists');
    return this.toStaffDto(staff);
  }

  private toStaffDto(staff: {
    id: string;
    name: string;
    email: string;
    restaurantId: string;
    role: StaffDto['role'];
  }): StaffDto {
    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      restaurantId: staff.restaurantId,
      role: staff.role,
    };
  }
}
