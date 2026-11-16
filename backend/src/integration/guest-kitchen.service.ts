import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FoodOrder } from '../modules/orders/entities/food-order.entity.js';
import { FoodOrderStatus } from '../modules/orders/enums/food-order-status.enum.js';
import { OrdersCreateService } from '../modules/orders/orders-create.service.js';
import { categoryMealPeriod } from './meal-period.js';

interface MenuRow {
  menu_item_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock_status: string;
  preparation_time: number;
  portion_limit: number;
  image_url: string | null;
  allergens: string[];
  dietary_flags: string[];
  order_start_time: string;
  order_cutoff_time: string;
  ordering_enabled: boolean;
}

/** Guest DTOs expose LKR rupees; the canonical tables always store integer cents. */
@Injectable()
export class GuestKitchenService {
  constructor(
    @InjectDataSource() private readonly database: DataSource,
    private readonly intake: OrdersCreateService,
  ) {}

  async menu(mealPeriod?: string) {
    if (
      mealPeriod &&
      !['BREAKFAST', 'LUNCH', 'DINNER', 'TEA_TIME'].includes(mealPeriod)
    )
      throw new BadRequestException('Invalid meal period');
    const rows = await this.database.query<MenuRow[]>(`
      SELECT m.*, c.name AS category, c.order_start_time, c.order_cutoff_time, c.ordering_enabled,
        COALESCE((SELECT jsonb_agg(a.name ORDER BY a.name) FROM kms_menu_item_allergens x
          JOIN kms_allergens a USING (allergen_id) WHERE x.menu_item_id = m.menu_item_id), '[]') AS allergens,
        COALESCE((SELECT jsonb_agg(d.name ORDER BY d.name) FROM kms_menu_item_dietary_labels x
          JOIN kms_dietary_labels d USING (dietary_label_id) WHERE x.menu_item_id = m.menu_item_id), '[]') AS dietary_flags
      FROM kms_menu_items m JOIN kms_meal_categories c USING (category_id) ORDER BY c.name, m.name`);
    const items = rows
      .map((row) => ({
        id: row.menu_item_id,
        name: row.name,
        description: row.description,
        price: row.price / 100,
        category: row.category,
        mealPeriods: [categoryMealPeriod(row.category)].filter(
          (period): period is string => period !== null,
        ),
        available: row.stock_status === 'AVAILABLE',
        estimatedPrepMinutes: row.preparation_time,
        portionLimit: row.portion_limit,
        imageUrl: row.image_url,
        allergens: row.allergens,
        dietaryFlags: row.dietary_flags,
        orderingWindow: {
          startTime: row.order_start_time,
          cutoffTime: row.order_cutoff_time,
          enabled: row.ordering_enabled,
        },
      }))
      .filter((item) => !mealPeriod || item.mealPeriods.includes(mealPeriod));
    return {
      version: '1.0',
      currency: 'LKR',
      generatedAt: new Date().toISOString(),
      categories: [...new Set(items.map((item) => item.category))],
      items,
    };
  }

  async create(body: unknown) {
    const created = await this.intake.createOrder(body);
    return this.order(created.orderId);
  }

  async order(id: string) {
    const order = await this.database
      .getRepository(FoodOrder)
      .findOne({ where: { orderId: id }, relations: { items: true } });
    if (!order) throw new NotFoundException('Food order not found');
    return {
      orderId: order.orderId,
      bookingId: order.bookingId,
      roomNumber: order.roomNumber,
      status: order.status,
      totalAmount: order.totalAmount / 100,
      allergyNotes: order.allergyNote,
      items: order.items.map((item) => ({
        itemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice / 100,
        specialNotes: item.specialNote,
      })),
      createdAt: order.placedAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      version: '1.0',
      currency: 'LKR',
    };
  }

  async cancel(id: string) {
    await this.database.transaction(async (manager) => {
      const repository = manager.getRepository(FoodOrder);
      const order = await repository.findOne({
        where: { orderId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Food order not found');
      if (order.status === FoodOrderStatus.CANCELLED) return;
      // Use the database clock after acquiring the same lock used by kitchen preparation.
      const [clock] = await manager.query<{ now: Date }[]>(
        'SELECT clock_timestamp() AS now',
      );
      if (
        order.status !== FoodOrderStatus.PLACED ||
        clock.now.getTime() - order.placedAt.getTime() >= 600_000
      )
        throw new ConflictException(
          'Only placed orders within ten minutes can be cancelled',
        );
      order.status = FoodOrderStatus.CANCELLED;
      await repository.save(order);
      await manager.query(
        'UPDATE kms_food_orders SET cancelled_at = clock_timestamp() WHERE order_id = $1',
        [id],
      );
    });
    return this.order(id);
  }
}
