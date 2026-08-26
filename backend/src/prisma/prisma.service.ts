import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 requires an explicit driver adapter (see prisma/seed.ts for the
// same pattern) — a bare `new PrismaClient()` no longer reads DATABASE_URL
// implicitly.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // The local `prisma dev` daemon closes idle connections more
        // aggressively than pg's own 10s default, so pooled clients can go
        // stale and fail with P1017 ("Server has closed the connection") on
        // their next query. Recycling idle clients well before that keeps
        // the pool from ever handing out a dead connection.
        idleTimeoutMillis: 5_000,
        keepAlive: true,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
