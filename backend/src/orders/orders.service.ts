import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import type {
  ExcludedIngredientSnapshotDto,
  LocalizedText,
  ModifierSnapshotDto,
  OrderDto,
  OrderItemDto,
  ReorderResultDto,
  ReorderSkipReason,
  ReorderSkippedItemDto,
} from './orders.types';
import { DomainEvents } from '../realtime/domain-events';
import type { AuthenticatedStaff } from '../auth/auth.types';
import type { $Enums } from '../../generated/prisma/client';

// Distinguishable subclasses (still real NotFound/BadRequest responses for
// the normal POST /orders flow) so reorder() can tell WHY a given item from
// the last order failed re-validation without parsing error messages.
class DishNotFoundError extends NotFoundException {}
class DishUnavailableError extends BadRequestException {}
class DishOptionsChangedError extends BadRequestException {}

// One-directional lifecycle, no skipping and no going back - same discipline
// as WaiterCallsService. This transitions the ORDER as a whole; per-item
// kitchen routing (multi-station KDS) is out of scope for this phase.
const ALLOWED_ORDER_TRANSITIONS: Record<string, $Enums.OrderStatus[]> = {
  NEW: ['ACCEPTED'],
  ACCEPTED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: [],
};

function asLocalized(value: unknown): LocalizedText {
  return value as LocalizedText;
}

const WITHOUT_LABEL: LocalizedText = { uk: 'Без:', en: 'Without:' };

// Prisma's generated Dish payload shape with the includes this service needs -
// kept as a type alias rather than importing the generated client's verbose
// GetPayload type, since only these three relations are ever touched here.
interface DishWithOptions {
  id: string;
  slug: string;
  name: unknown;
  price: { toNumber(): number };
  emoji: string | null;
  gradient: string | null;
  isAvailable: boolean;
  modifierGroups: {
    id: string;
    name: unknown;
    sortOrder: number;
    choices: {
      id: string;
      name: unknown;
      priceDelta: { toNumber(): number };
      sortOrder: number;
    }[];
  }[];
  ingredients: { id: string; name: unknown }[];
}

interface PreparedItem {
  dish: DishWithOptions;
  quantity: number;
  chosenChoices: {
    groupId: string;
    groupName: LocalizedText;
    groupSortOrder: number;
    choiceId: string;
    choiceName: LocalizedText;
    priceDelta: number;
    choiceSortOrder: number;
  }[];
  excludedIngredients: ExcludedIngredientSnapshotDto[];
  basePrice: number;
  lineTotal: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderDto> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: dto.guestSessionId },
      include: { table: { include: { location: true } } },
    });
    if (!session)
      throw new NotFoundException(
        `Unknown guest session: ${dto.guestSessionId}`,
      );

    const prepared: PreparedItem[] = [];
    for (const itemDto of dto.items) {
      prepared.push(await this.prepareItem(itemDto));
    }

    return this.persistOrder(
      session.tableId,
      session.id,
      session.table.location.restaurantId,
      prepared,
    );
  }

  /**
   * D8 "Order again": repeats the table's most recent Order. Every item is
   * re-validated against the LIVE menu independently via the same
   * prepareItem() used by create() - nothing here trusts the old order's
   * stored price, and a dish that's since been deleted, marked unavailable,
   * or had its modifiers/ingredients change just drops that one item (with
   * a reason) instead of failing the whole reorder.
   */
  async reorder(guestSessionId: string): Promise<ReorderResultDto> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: guestSessionId },
      include: { table: { include: { location: true } } },
    });
    if (!session)
      throw new NotFoundException(`Unknown guest session: ${guestSessionId}`);

    const lastOrder = await this.prisma.order.findFirst({
      where: {
        tableId: session.tableId,
        createdAt: { gt: session.table.lastClosedAt ?? undefined },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastOrder) {
      throw new NotFoundException('This table has no previous order to repeat');
    }

    const prepared: PreparedItem[] = [];
    const skippedItems: ReorderSkippedItemDto[] = [];

    for (const item of lastOrder.items) {
      const modifierChoiceIds = (
        (item.modifiersSnapshot as ModifierSnapshotDto[] | null) ?? []
      ).map((m) => m.choiceId);
      const excludedIngredientIds = (
        (item.excludedIngredientsSnapshot as
          ExcludedIngredientSnapshotDto[] | null) ?? []
      ).map((e) => e.id);

      try {
        prepared.push(
          await this.prepareItem({
            dishId: item.dishId,
            quantity: item.quantity,
            modifierChoiceIds,
            excludedIngredientIds,
          }),
        );
      } catch (err) {
        const reason: ReorderSkipReason =
          err instanceof DishNotFoundError
            ? 'NOT_FOUND'
            : err instanceof DishUnavailableError
              ? 'UNAVAILABLE'
              : 'OPTIONS_CHANGED';
        skippedItems.push({
          name: asLocalized(item.nameSnapshot),
          quantity: item.quantity,
          reason,
        });
      }
    }

    if (prepared.length === 0) {
      return { order: null, skippedItems };
    }

    const order = await this.persistOrder(
      session.tableId,
      session.id,
      session.table.location.restaurantId,
      prepared,
    );
    return { order, skippedItems };
  }

  private async persistOrder(
    tableId: string,
    guestSessionId: string,
    restaurantId: string,
    prepared: PreparedItem[],
  ): Promise<OrderDto> {
    const order = await this.prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          tableId,
          guestSessionId,
          status: 'NEW',
          items: {
            create: prepared.map((item) => this.toOrderItemCreateInput(item)),
          },
        },
        include: { items: true },
      });
    });

    const dtoResult = this.toOrderDto(order);
    this.eventEmitter.emit(DomainEvents.ORDER_CREATED, {
      restaurantId,
      tableId,
      order: dtoResult,
    });
    return dtoResult;
  }

  /** Staff-only: transitions the order as a whole (NEW -> ... -> SERVED). */
  async updateStatus(
    id: string,
    nextStatus: $Enums.OrderStatus,
    staff: AuthenticatedStaff,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, table: { include: { location: true } } },
    });
    if (!order) throw new NotFoundException(`Unknown order: ${id}`);
    if (order.table.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This order belongs to a different restaurant',
      );
    }

    const allowed = ALLOWED_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${nextStatus}`,
      );
    }

    // No per-item kitchen routing in this phase (see ALLOWED_ORDER_TRANSITIONS
    // above) - every item mirrors the order's status, so items must move in
    // lockstep with it rather than staying frozen at their created-with NEW.
    const [, updated] = await this.prisma.$transaction([
      this.prisma.orderItem.updateMany({
        where: { orderId: id },
        data: { status: nextStatus },
      }),
      this.prisma.order.update({
        where: { id },
        data: { status: nextStatus },
        include: { items: true },
      }),
    ]);

    const dtoResult = this.toOrderDto(updated);
    this.eventEmitter.emit(DomainEvents.ORDER_STATUS_UPDATED, {
      restaurantId: order.table.location.restaurantId,
      tableId: order.tableId,
      order: dtoResult,
    });
    return dtoResult;
  }

  /** Staff-only read model: every not-yet-SERVED order across the restaurant. */
  async findActiveForRestaurant(restaurantId: string): Promise<OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { not: 'SERVED' },
        table: { location: { restaurantId } },
      },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return orders.map((order) => this.toOrderDto(order));
  }

  /**
   * Waiter App floor plan: which tables have money owed on them, regardless
   * of kitchen status - broader than findActiveForRestaurant's "not yet
   * SERVED" (a fully-served, unpaid table has nothing left to cook, but
   * still needs a bill). See StaffService.getOverview, which combines this
   * with hasActiveOrder to tell "still cooking/serving" apart from
   * "everything's out, just needs payment".
   */
  async findUnpaidTableIds(restaurantId: string): Promise<string[]> {
    const rows = await this.prisma.order.findMany({
      where: { paidAt: null, table: { location: { restaurantId } } },
      select: { tableId: true },
      distinct: ['tableId'],
    });
    return rows.map((r) => r.tableId);
  }

  async findById(id: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Unknown order: ${id}`);
    return this.toOrderDto(order);
  }

  async findForGuestSession(guestSessionId: string): Promise<OrderDto[]> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: guestSessionId },
      include: { table: true },
    });
    if (!session)
      throw new NotFoundException(`Unknown guest session: ${guestSessionId}`);

    // Orders belong to the TABLE (see Order.tableId) - a guest session is only
    // provenance, so this returns the table's whole *current* visit, not
    // just this one device's own submissions (matches src/types/table.ts's
    // original design note). "Current visit" excludes anything from before
    // the table's last staff-initiated close (see TablesService.close) -
    // otherwise a past, already-settled visit's orders would resurface and
    // get merged into whatever the next guests order (see orderStore.ts's
    // mergeOrders on the client, which relied on this being scoped already).
    return this.findCurrentOrdersForTable(
      session.tableId,
      session.table.lastClosedAt,
    );
  }

  /** Waiter App table detail: same "current visit" scoping as findForGuestSession, keyed directly by table instead of via a guest session. */
  async findCurrentForTable(
    tableId: string,
    staff: AuthenticatedStaff,
  ): Promise<OrderDto[]> {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { location: true },
    });
    if (!table) throw new NotFoundException(`Unknown table: ${tableId}`);
    if (table.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This table belongs to a different restaurant',
      );
    }

    return this.findCurrentOrdersForTable(tableId, table.lastClosedAt);
  }

  private async findCurrentOrdersForTable(
    tableId: string,
    lastClosedAt: Date | null,
  ): Promise<OrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { tableId, createdAt: { gt: lastClosedAt ?? undefined } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    return orders.map((order) => this.toOrderDto(order));
  }

  private async prepareItem(
    itemDto: CreateOrderItemDto,
  ): Promise<PreparedItem> {
    const dish = await this.prisma.dish.findUnique({
      where: { id: itemDto.dishId },
      include: {
        modifierGroups: { include: { choices: true } },
        ingredients: true,
      },
    });
    if (!dish) throw new DishNotFoundError(`Unknown dish: ${itemDto.dishId}`);
    if (!dish.isAvailable) {
      throw new DishUnavailableError(
        `Dish is no longer available: ${dish.slug}`,
      );
    }

    const allChoices = dish.modifierGroups.flatMap((group) =>
      group.choices.map((choice) => ({ group, choice })),
    );

    const chosenChoices = (itemDto.modifierChoiceIds ?? []).map((choiceId) => {
      const match = allChoices.find((c) => c.choice.id === choiceId);
      if (!match) {
        throw new DishOptionsChangedError(
          `Modifier choice ${choiceId} does not exist on dish ${dish.slug}`,
        );
      }
      return {
        groupId: match.group.id,
        groupName: asLocalized(match.group.name),
        groupSortOrder: match.group.sortOrder,
        choiceId: match.choice.id,
        choiceName: asLocalized(match.choice.name),
        priceDelta: match.choice.priceDelta.toNumber(),
        choiceSortOrder: match.choice.sortOrder,
      };
    });

    const excludedIngredients: ExcludedIngredientSnapshotDto[] = (
      itemDto.excludedIngredientIds ?? []
    ).map((ingredientId) => {
      const match = dish.ingredients.find((i) => i.id === ingredientId);
      if (!match) {
        throw new DishOptionsChangedError(
          `Ingredient ${ingredientId} does not exist on dish ${dish.slug}`,
        );
      }
      return { id: match.id, name: asLocalized(match.name) };
    });

    const basePrice = dish.price.toNumber();
    const priceDeltaSum = chosenChoices.reduce(
      (sum, c) => sum + c.priceDelta,
      0,
    );
    const lineTotal = (basePrice + priceDeltaSum) * itemDto.quantity;

    return {
      dish,
      quantity: itemDto.quantity,
      chosenChoices,
      excludedIngredients,
      basePrice,
      lineTotal,
    };
  }

  private toOrderItemCreateInput(item: PreparedItem) {
    const modifiersSnapshot: ModifierSnapshotDto[] = item.chosenChoices
      .slice()
      .sort(
        (a, b) =>
          a.groupSortOrder - b.groupSortOrder ||
          a.choiceSortOrder - b.choiceSortOrder,
      )
      .map((c) => ({
        groupId: c.groupId,
        groupName: c.groupName,
        choiceId: c.choiceId,
        choiceName: c.choiceName,
        priceDelta: c.priceDelta,
      }));

    return {
      dishId: item.dish.id,
      dishSlug: item.dish.slug,
      nameSnapshot: item.dish.name as object,
      emojiSnapshot: item.dish.emoji,
      gradientSnapshot: item.dish.gradient,
      basePriceSnapshot: item.basePrice,
      modifiersSnapshot: modifiersSnapshot.length
        ? (modifiersSnapshot as unknown as object)
        : undefined,
      excludedIngredientsSnapshot: item.excludedIngredients.length
        ? (item.excludedIngredients as unknown as object)
        : undefined,
      selectionsSummarySnapshot: this.buildSelectionsSummary(
        modifiersSnapshot,
      ) as unknown as object,
      excludedSummarySnapshot: this.buildExcludedSummary(
        item.excludedIngredients,
      ) as unknown as object,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      status: 'NEW' as const,
    };
  }

  private buildSelectionsSummary(
    modifiers: ModifierSnapshotDto[],
  ): LocalizedText {
    const byGroup = new Map<
      string,
      { groupName: LocalizedText; choices: LocalizedText[] }
    >();
    for (const m of modifiers) {
      const entry = byGroup.get(m.groupId) ?? {
        groupName: m.groupName,
        choices: [],
      };
      entry.choices.push(m.choiceName);
      byGroup.set(m.groupId, entry);
    }
    const locales: (keyof LocalizedText)[] = ['uk', 'en'];
    const result: LocalizedText = { uk: '', en: '' };
    for (const locale of locales) {
      result[locale] = [...byGroup.values()]
        .map(
          (entry) =>
            `${entry.groupName[locale]}: ${entry.choices.map((c) => c[locale]).join(', ')}`,
        )
        .join(' · ');
    }
    return result;
  }

  private buildExcludedSummary(
    excluded: ExcludedIngredientSnapshotDto[],
  ): LocalizedText {
    if (excluded.length === 0) return { uk: '', en: '' };
    const locales: (keyof LocalizedText)[] = ['uk', 'en'];
    const result: LocalizedText = { uk: '', en: '' };
    for (const locale of locales) {
      result[locale] =
        `${WITHOUT_LABEL[locale]} ${excluded.map((i) => i.name[locale]).join(', ')}`;
    }
    return result;
  }

  private toOrderDto(order: {
    id: string;
    tableId: string;
    guestSessionId: string | null;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    items: {
      id: string;
      dishId: string;
      dishSlug: string;
      nameSnapshot: unknown;
      emojiSnapshot: string | null;
      gradientSnapshot: string | null;
      basePriceSnapshot: { toNumber(): number };
      modifiersSnapshot: unknown;
      excludedIngredientsSnapshot: unknown;
      selectionsSummarySnapshot: unknown;
      excludedSummarySnapshot: unknown;
      quantity: number;
      lineTotal: { toNumber(): number };
      status: string;
      createdAt: Date;
    }[];
  }): OrderDto {
    return {
      id: order.id,
      tableId: order.tableId,
      guestSessionId: order.guestSessionId,
      status: order.status,
      createdAt: order.createdAt.getTime(),
      paidAt: order.paidAt?.getTime() ?? null,
      items: order.items.map((item): OrderItemDto => ({
        id: item.id,
        dishId: item.dishId,
        dishSlug: item.dishSlug,
        name: asLocalized(item.nameSnapshot),
        emoji: item.emojiSnapshot ?? '',
        gradient: item.gradientSnapshot ?? '',
        basePrice: item.basePriceSnapshot.toNumber(),
        modifiers:
          (item.modifiersSnapshot as ModifierSnapshotDto[] | null) ?? [],
        excludedIngredients:
          (item.excludedIngredientsSnapshot as
            ExcludedIngredientSnapshotDto[] | null) ?? [],
        selectionsSummary: asLocalized(
          item.selectionsSummarySnapshot ?? { uk: '', en: '' },
        ),
        excludedSummary: asLocalized(
          item.excludedSummarySnapshot ?? { uk: '', en: '' },
        ),
        quantity: item.quantity,
        lineTotal: item.lineTotal.toNumber(),
        status: item.status,
        createdAt: item.createdAt.getTime(),
      })),
    };
  }
}
