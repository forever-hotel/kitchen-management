import { Injectable, NotFoundException } from '@nestjs/common';

import { FoodOrderResponseDto } from './dto/order-response.dto.js';
import { OrderQueueResponseDto } from './dto/order-queue-response.dto.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { parseOrderQueueQuery } from './order-queue-query.js';
import { FoodOrderRepository } from './repositories/food-order.repository.js';

@Injectable()
export class OrdersService {
  constructor(private readonly orders: FoodOrderRepository) {}

  async listQueue(
    query: Record<string, unknown>,
  ): Promise<OrderQueueResponseDto> {
    const { statuses, limit, offset } = parseOrderQueueQuery(query);
    const [orders, total] = await this.orders.findQueue(
      statuses,
      offset,
      limit,
    );
    return {
      items: orders.map((order) => this.toResponse(order)),
      total,
      offset,
      limit,
    };
  }

  async getDetails(orderId: string): Promise<FoodOrderResponseDto> {
    const order = await this.orders.findByIdWithItems(orderId);
    if (!order) throw new NotFoundException('Food order not found');
    return this.toResponse(order);
  }

  private toResponse(order: FoodOrder): FoodOrderResponseDto {
    const sortedItems = [...(order.items ?? [])].sort((left, right) => {
      const timeDifference =
        left.createdAt.getTime() - right.createdAt.getTime();
      return (
        timeDifference || left.orderItemId.localeCompare(right.orderItemId)
      );
    });

    return {
      orderId: order.orderId,
      bookingId: order.bookingId,
      roomNumber: order.roomNumber,
      mealPeriod: order.mealPeriod,
      status: order.status,
      placedAt: order.placedAt.toISOString(),
      estimatedDeliveryTime: order.estimatedDeliveryTime?.toISOString() ?? null,
      allergyNote: order.allergyNote,
      totalAmount: order.totalAmount,
      items: sortedItems.map((item) => ({
        orderItemId: item.orderItemId,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        specialNote: item.specialNote,
      })),
    };
  }
}
