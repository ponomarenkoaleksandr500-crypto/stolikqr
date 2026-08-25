import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  CLIENT_TRACKABLE_EVENT_NAMES,
  type ClientTrackableEventName,
} from '../analytics.types';

export class TrackEventDto {
  @IsIn(CLIENT_TRACKABLE_EVENT_NAMES)
  name!: ClientTrackableEventName;

  // Deliberately trusted from the client here, unlike Order/Payment - a
  // wrong or spoofed restaurantId on a single analytics ping mis-attributes
  // one funnel event, not money or another table's data, and the Guest App
  // already knows it legitimately from the menu response it fetched
  // (GET /restaurants/:slug/menu or /tables/:qrToken/menu both return
  // restaurant.id). See D7 summary for the full reasoning.
  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  // tableId is deliberately NOT accepted from the client: the Guest App's
  // TableSessionProvider only ever holds a synthetic client-side Table id
  // (`${slug}-${code}`, see resolveTable() in table/TableSessionProvider.tsx),
  // never the real backend Table.id. AnalyticsService derives the real one
  // server-side from guestSessionId instead when one is given.
  @IsString()
  @IsOptional()
  guestSessionId?: string;

  @IsString()
  @IsOptional()
  dishId?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
