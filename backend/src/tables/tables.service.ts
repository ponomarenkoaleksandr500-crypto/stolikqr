import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // Translates today's URL shape (/r/[slug]/t/[tableCode]) into the table's
  // qrToken. This is the one place the client-visible slug+code pair is used;
  // everything downstream (menu, guest session) is keyed by qrToken alone.
  // Once real QR provisioning encodes the qrToken directly in the printed
  // code's URL, this lookup becomes unnecessary.
  async resolveBySlugAndCode(
    slug: string,
    code: string,
  ): Promise<{ tableId: string; qrToken: string }> {
    const table = await this.prisma.table.findFirst({
      where: { code, location: { restaurant: { slug } } },
    });
    if (!table)
      throw new NotFoundException(
        `No table "${code}" for restaurant "${slug}"`,
      );
    return { tableId: table.id, qrToken: table.qrToken };
  }
}
