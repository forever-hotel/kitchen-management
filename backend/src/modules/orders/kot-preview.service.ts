import { Injectable } from '@nestjs/common';

import { KotPreviewDto } from './dto/kot-preview.dto.js';
import { OrdersService } from './orders.service.js';

/** Create a read-only ticket from immutable, persisted food-order item snapshots. */
@Injectable()
export class KotPreviewService {
  constructor(private readonly orders: OrdersService) {}

  async preview(orderId: string): Promise<KotPreviewDto> {
    const order = await this.orders.getDetails(orderId);
    return {
      mode: 'PREVIEW_ONLY',
      orderId: order.orderId,
      roomNumber: order.roomNumber,
      mealPeriod: order.mealPeriod,
      status: order.status,
      placedAt: order.placedAt,
      allergyNote: order.allergyNote,
      items: order.items.map((item) => ({
        orderItemId: item.orderItemId,
        name: item.name,
        quantity: item.quantity,
        specialNote: item.specialNote,
      })),
    };
  }
}
