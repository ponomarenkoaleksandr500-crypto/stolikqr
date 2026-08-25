import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedStaff } from './auth.types';

export const CurrentStaff = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedStaff => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedStaff }>();
    return request.user;
  },
);
