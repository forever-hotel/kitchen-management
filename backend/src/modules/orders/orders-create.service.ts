import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError } from 'typeorm';

import { MenuItemStockStatus } from '../menu/enums/menu-item-stock-status.enum.js';
import { MenuItem } from '../menu/entities/menu-item.entity.js';
import { CreateOrderResponseDto } from './dto/create-order-response.dto.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';
import {
  assertSameOriginalRequest,
  isCategoryOrderingOpen,
  matchesMealPeriod,
  stableOrderId,
} from './order-intake-logic.js';
import { validateOrderIntake } from './order-intake.validation.js';

interface BookingContext {
  room_number: string | null;
  status: string;
}

/** Persistence is protected by the orders primary key; no ephemeral cache is involved. */
@Injectable()
export class OrdersCreateService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createOrder(body: unknown): Promise<CreateOrderResponseDto> {
    const payload = validateOrderIntake(body);
    const orderId = stableOrderId(payload.idempotencyKey);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const orderRepository = manager.getRepository(FoodOrder);
        const existing = await orderRepository.findOne({
          where: { orderId },
          relations: { items: true },
        });
        if (existing) {
          assertSameOriginalRequest(existing, payload);
          return this.toResponse(existing, true);
        }

        // Bookings remain owned by Front Desk; verify read-only stay context.
        const bookings = (await manager.query(
          'SELECT room_number, status FROM bookings WHERE booking_id = $1 FOR SHARE',
          [payload.bookingId],
        )) as BookingContext[];
        if (
          bookings.length !== 1 ||
          bookings[0]?.status !== 'CHECKED_IN' ||
          bookings[0]?.room_number !== payload.roomNumber
        ) {
          throw new BadRequestException(
            'Booking is not checked in to the requested room',
          );
        }

        const menuItems = await manager.getRepository(MenuItem).find({
          where: {
            menuItemId: In(payload.items.map((item) => item.menuItemId)),
          },
          relations: { category: true },
        });
        if (menuItems.length !== payload.items.length) {
          throw new NotFoundException('One or more menu items no longer exist');
        }

        const menuById = new Map(
          menuItems.map((item) => [item.menuItemId, item]),
        );
        const now = new Date();
        const snapshots = payload.items.map((item) => {
          const menu = menuById.get(item.menuItemId);
          if (!menu) throw new NotFoundException('Menu item not found');
          if (!matchesMealPeriod(menu, payload.mealPeriod)) {
            throw new BadRequestException(
              'An item does not match the requested meal period',
            );
          }
          if (!menu.category || !isCategoryOrderingOpen(menu.category, now)) {
            throw new BadRequestException(
              'Ordering is closed for the selected meal period',
            );
          }
          // LOW_STOCK remains unavailable until an approved allocation policy exists.
          if (menu.stockStatus !== MenuItemStockStatus.AVAILABLE) {
            throw new BadRequestException(
              'A requested menu item is unavailable',
            );
          }
          if (
            !Number.isInteger(menu.portionLimit) ||
            item.quantity > menu.portionLimit
          ) {
            throw new BadRequestException(
              'Requested quantity exceeds the menu portion limit',
            );
          }
          if (!Number.isSafeInteger(menu.price) || menu.price <= 0) {
            throw new BadRequestException('The menu item has an invalid price');
          }
          return {
            menuItemId: menu.menuItemId,
            name: menu.name,
            quantity: item.quantity,
            unitPrice: menu.price,
            specialNote: item.specialNote,
          };
        });

        const totalAmount = snapshots.reduce(
          (total, item) => total + item.quantity * item.unitPrice,
          0,
        );
        if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
          throw new BadRequestException('The order total is invalid');
        }

        const order = orderRepository.create({
          orderId,
          bookingId: payload.bookingId,
          roomNumber: payload.roomNumber,
          mealPeriod: payload.mealPeriod,
          allergyNote: payload.allergyNote,
          totalAmount,
          status: FoodOrderStatus.PLACED,
          placedAt: now,
          estimatedDeliveryTime: null,
        });
        await orderRepository.save(order);
        const itemRepo = manager.getRepository(FoodOrderItem);
        await itemRepo.save(
          snapshots.map((item) => itemRepo.create({ ...item, orderId })),
        );
        return this.toResponse(order, false);
      });
    } catch (error) {
      // Another concurrent request may have inserted the same idempotency key.
      if (error instanceof QueryFailedError) {
        const driver = error.driverError as {
          code?: string;
          constraint?: string;
        };
        if (
          driver.code === '23505' &&
          driver.constraint === 'kms_food_orders_pkey'
        ) {
          const existing = await this.dataSource
            .getRepository(FoodOrder)
            .findOne({
              where: { orderId },
              relations: { items: true },
            });
          if (existing) {
            assertSameOriginalRequest(existing, payload);
            return this.toResponse(existing, true);
          }
          throw new ConflictException(
            'Duplicate order request is still in progress',
          );
        }
        if (driver.code === '23503') {
          throw new BadRequestException(
            'An order reference is no longer valid',
          );
        }
      }
      throw error;
    }
  }

  private toResponse(
    order: FoodOrder,
    replayed: boolean,
  ): CreateOrderResponseDto {
    return {
      orderId: order.orderId,
      status: order.status,
      totalAmount: order.totalAmount,
      replayed,
    };
  }
}
