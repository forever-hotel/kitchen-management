import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { FoodOrderMealPeriod } from '../enums/food-order-meal-period.enum.js';
import { FoodOrderStatus } from '../enums/food-order-status.enum.js';
import type { FoodOrderItem } from './food-order-item.entity.js';

@Check('"total_amount" >= 0')
@Entity({ name: 'kms_food_orders' })
export class FoodOrder {
  @PrimaryGeneratedColumn('uuid', {
    name: 'order_id',
  })
  orderId!: string;

  /*
   * booking_id is intentionally mapped as an opaque UUID rather than a
   * TypeORM Booking relation. Booking is owned by another subsystem and KMS
   * must not duplicate that domain model.
   */
  @Column({
    name: 'booking_id',
    type: 'uuid',
  })
  bookingId!: string;

  /*
   * room_number is intentionally denormalized for kitchen-display
   * performance as defined by the approved design.
   */
  @Column({
    name: 'room_number',
    type: 'varchar',
    length: 10,
  })
  roomNumber!: string;

  @Column({
    name: 'meal_period',
    type: 'enum',
    enum: FoodOrderMealPeriod,
    enumName: 'food_order_meal_period',
  })
  mealPeriod!: FoodOrderMealPeriod;

  @Column({
    name: 'allergy_note',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  allergyNote!: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: FoodOrderStatus,
    enumName: 'food_order_status',
    default: FoodOrderStatus.PLACED,
  })
  status!: FoodOrderStatus;

  @Column({
    name: 'total_amount',
    type: 'integer',
  })
  totalAmount!: number;

  @Column({
    name: 'placed_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  placedAt!: Date;

  @Column({
    name: 'estimated_delivery_time',
    type: 'timestamptz',
    nullable: true,
  })
  estimatedDeliveryTime!: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @OneToMany('FoodOrderItem', 'order')
  items!: Relation<FoodOrderItem[]>;
}
