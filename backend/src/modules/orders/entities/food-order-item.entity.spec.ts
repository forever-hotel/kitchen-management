import { getMetadataArgsStorage } from 'typeorm';

import { FoodOrderItem } from './food-order-item.entity.js';

describe('FoodOrderItem entity', () => {
  const storage = getMetadataArgsStorage();

  const getColumn = (propertyName: string) =>
    storage.columns.find(
      (column) =>
        column.target === FoodOrderItem && column.propertyName === propertyName,
    );

  it('TC-KMS-ORDER-010: Given FoodOrderItem metadata, when inspected, then it maps to kms_food_order_items', () => {
    // Arrange / Act
    const table = storage.tables.find(
      (metadata) => metadata.target === FoodOrderItem,
    );

    // Assert
    expect(table?.name).toBe('kms_food_order_items');
  });

  it('TC-KMS-ORDER-011: Given FoodOrderItem metadata, when identifiers are inspected, then canonical UUID columns are used', () => {
    // Arrange / Act
    const orderItemId = getColumn('orderItemId');
    const orderId = getColumn('orderId');
    const menuItemId = getColumn('menuItemId');

    const generation = storage.generations.find(
      (metadata) =>
        metadata.target === FoodOrderItem &&
        metadata.propertyName === 'orderItemId',
    );

    // Assert
    expect(orderItemId?.options.name).toBe('order_item_id');
    expect(orderItemId?.options.primary).toBe(true);
    expect(generation?.strategy).toBe('uuid');

    expect(orderId?.options).toMatchObject({
      name: 'order_id',
      type: 'uuid',
    });

    expect(menuItemId?.options).toMatchObject({
      name: 'menu_item_id',
      type: 'uuid',
    });
  });

  it('TC-KMS-ORDER-012: Given historical item snapshots, when metadata is inspected, then name and unit price are persisted independently of MenuItem', () => {
    // Arrange / Act
    const name = getColumn('name');
    const unitPrice = getColumn('unitPrice');

    // Assert
    expect(name?.options).toMatchObject({
      name: 'name',
      type: 'varchar',
      length: 255,
    });

    expect(unitPrice?.options).toMatchObject({
      name: 'unit_price',
      type: 'integer',
    });
  });

  it('TC-KMS-ORDER-013: Given FoodOrderItem metadata, when quantity and special-note fields are inspected, then canonical mappings are used', () => {
    // Arrange / Act
    const quantity = getColumn('quantity');
    const specialNote = getColumn('specialNote');

    // Assert
    expect(quantity?.options).toMatchObject({
      name: 'quantity',
      type: 'integer',
    });

    expect(specialNote?.options).toMatchObject({
      name: 'special_note',
      type: 'varchar',
      length: 300,
      nullable: true,
    });
  });

  it('TC-KMS-ORDER-014: Given FoodOrderItem constraints, when inspected, then quantity and unit price must be positive', () => {
    // Arrange / Act
    const expressions = storage.checks
      .filter((metadata) => metadata.target === FoodOrderItem)
      .map((metadata) => metadata.expression);

    // Assert
    expect(expressions).toContain('"quantity" > 0');
    expect(expressions).toContain('"unit_price" > 0');
  });

  it('TC-KMS-ORDER-015: Given a FoodOrderItem, when order relation metadata is inspected, then order_id is required and cascades on FoodOrder deletion', () => {
    // Arrange / Act
    const relation = storage.relations.find(
      (metadata) =>
        metadata.target === FoodOrderItem && metadata.propertyName === 'order',
    );

    const joinColumn = storage.joinColumns.find(
      (metadata) =>
        metadata.target === FoodOrderItem && metadata.propertyName === 'order',
    );

    // Assert
    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options.nullable).toBe(false);
    expect(relation?.options.onDelete).toBe('CASCADE');

    expect(joinColumn?.name).toBe('order_id');
    expect(joinColumn?.referencedColumnName).toBe('orderId');
  });

  it('TC-KMS-ORDER-016: Given a FoodOrderItem, when MenuItem relation metadata is inspected, then menu_item_id references the existing MenuItem model', () => {
    // Arrange / Act
    const relation = storage.relations.find(
      (metadata) =>
        metadata.target === FoodOrderItem &&
        metadata.propertyName === 'menuItem',
    );

    const joinColumn = storage.joinColumns.find(
      (metadata) =>
        metadata.target === FoodOrderItem &&
        metadata.propertyName === 'menuItem',
    );

    // Assert
    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options.nullable).toBe(false);

    expect(joinColumn?.name).toBe('menu_item_id');
    expect(joinColumn?.referencedColumnName).toBe('menuItemId');
  });

  it('TC-KMS-ORDER-017: Given normalized FoodOrderItem persistence, when columns are inspected, then no JSON or JSONB storage exists', () => {
    // Arrange / Act
    const columnTypes = storage.columns
      .filter((column) => column.target === FoodOrderItem)
      .map((column) => column.options.type);

    // Assert
    expect(columnTypes).not.toContain('json');
    expect(columnTypes).not.toContain('jsonb');
  });
});
