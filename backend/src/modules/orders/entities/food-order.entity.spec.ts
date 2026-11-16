import { getMetadataArgsStorage } from 'typeorm';

import { FoodOrderMealPeriod } from '../enums/food-order-meal-period.enum.js';
import { FoodOrderStatus } from '../enums/food-order-status.enum.js';
import { FoodOrder } from './food-order.entity.js';

describe('FoodOrder entity', () => {
  const storage = getMetadataArgsStorage();

  const getColumn = (propertyName: string) =>
    storage.columns.find(
      (column) =>
        column.target === FoodOrder && column.propertyName === propertyName,
    );

  it('TC-KMS-ORDER-003: Given FoodOrder metadata, when inspected, then it maps to kms_food_orders', () => {
    // Arrange / Act
    const table = storage.tables.find(
      (metadata) => metadata.target === FoodOrder,
    );

    // Assert
    expect(table?.name).toBe('kms_food_orders');
  });

  it('TC-KMS-ORDER-004: Given FoodOrder metadata, when identifiers and kitchen-display fields are inspected, then canonical mappings are used', () => {
    // Arrange / Act
    const orderId = getColumn('orderId');
    const bookingId = getColumn('bookingId');
    const roomNumber = getColumn('roomNumber');

    const generation = storage.generations.find(
      (metadata) =>
        metadata.target === FoodOrder && metadata.propertyName === 'orderId',
    );

    // Assert
    expect(orderId?.options.name).toBe('order_id');
    expect(orderId?.options.primary).toBe(true);
    expect(generation?.strategy).toBe('uuid');

    expect(bookingId?.options).toMatchObject({
      name: 'booking_id',
      type: 'uuid',
    });

    expect(roomNumber?.options).toMatchObject({
      name: 'room_number',
      type: 'varchar',
      length: 10,
    });
  });

  it('TC-KMS-ORDER-005: Given FoodOrder enum metadata, when inspected, then canonical PostgreSQL enums and defaults are used', () => {
    // Arrange / Act
    const mealPeriod = getColumn('mealPeriod');
    const status = getColumn('status');

    // Assert
    expect(mealPeriod?.options).toMatchObject({
      name: 'meal_period',
      type: 'enum',
      enum: FoodOrderMealPeriod,
      enumName: 'food_order_meal_period',
    });

    expect(status?.options).toMatchObject({
      name: 'status',
      type: 'enum',
      enum: FoodOrderStatus,
      enumName: 'food_order_status',
      default: FoodOrderStatus.PLACED,
    });
  });

  it('TC-KMS-ORDER-006: Given FoodOrder monetary and optional metadata, when inspected, then approved types and nullability are used', () => {
    // Arrange / Act
    const totalAmount = getColumn('totalAmount');
    const allergyNote = getColumn('allergyNote');
    const estimatedDeliveryTime = getColumn('estimatedDeliveryTime');

    // Assert
    expect(totalAmount?.options).toMatchObject({
      name: 'total_amount',
      type: 'integer',
    });

    expect(allergyNote?.options).toMatchObject({
      name: 'allergy_note',
      type: 'varchar',
      length: 300,
      nullable: true,
    });

    expect(estimatedDeliveryTime?.options).toMatchObject({
      name: 'estimated_delivery_time',
      type: 'timestamptz',
      nullable: true,
    });
  });

  it('TC-KMS-ORDER-007: Given FoodOrder metadata, when the total constraint is inspected, then negative totals are prohibited', () => {
    // Arrange / Act
    const check = storage.checks.find(
      (metadata) =>
        metadata.target === FoodOrder &&
        metadata.expression === '"total_amount" >= 0',
    );

    // Assert
    expect(check).toBeDefined();
  });

  it('TC-KMS-ORDER-008: Given normalized order persistence, when relations are inspected, then FoodOrder exposes FoodOrderItems as one-to-many', () => {
    // Arrange / Act
    const relation = storage.relations.find(
      (metadata) =>
        metadata.target === FoodOrder && metadata.propertyName === 'items',
    );

    // Assert
    expect(relation?.relationType).toBe('one-to-many');
  });

  it('TC-KMS-ORDER-009: Given normalized order persistence, when FoodOrder columns are inspected, then no JSON or JSONB order-item storage exists', () => {
    // Arrange / Act
    const columnTypes = storage.columns
      .filter((column) => column.target === FoodOrder)
      .map((column) => column.options.type);

    // Assert
    expect(columnTypes).not.toContain('json');
    expect(columnTypes).not.toContain('jsonb');
  });
});
