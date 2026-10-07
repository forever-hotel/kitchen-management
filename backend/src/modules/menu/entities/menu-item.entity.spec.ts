import { getMetadataArgsStorage } from 'typeorm';

import { MenuItemStockStatus } from '../enums/menu-item-stock-status.enum.js';
import { MenuItem } from './menu-item.entity.js';

describe('MenuItem entity', () => {
  const storage = getMetadataArgsStorage();

  const getColumn = (propertyName: string) =>
    storage.columns.find(
      (column) =>
        column.target === MenuItem && column.propertyName === propertyName,
    );

  it('TC-KMS-MENU-006: Given MenuItem metadata, when inspected, then it maps to the approved KMS table', () => {
    // Arrange / Act
    const table = storage.tables.find(
      (metadata) => metadata.target === MenuItem,
    );

    // Assert
    expect(table?.name).toBe('kms_menu_items');
  });

  it('TC-KMS-MENU-007: Given MenuItem metadata, when core columns are inspected, then approved field mappings are used', () => {
    // Arrange / Act
    const menuItemId = getColumn('menuItemId');
    const categoryId = getColumn('categoryId');
    const price = getColumn('price');
    const preparationTime = getColumn('preparationTime');
    const portionLimit = getColumn('portionLimit');

    // Assert
    expect(menuItemId?.options.name).toBe('menu_item_id');
    expect(menuItemId?.options.primary).toBe(true);

    expect(categoryId?.options).toMatchObject({
      name: 'category_id',
      type: 'uuid',
    });

    expect(price?.options).toMatchObject({
      name: 'price',
      type: 'integer',
    });

    expect(preparationTime?.options).toMatchObject({
      name: 'preparation_time',
      type: 'integer',
    });

    expect(portionLimit?.options).toMatchObject({
      name: 'portion_limit',
      type: 'integer',
      default: 5,
    });
  });

  it('TC-KMS-MENU-008: Given optional MenuItem fields, when metadata is inspected, then only approved fields are nullable', () => {
    // Arrange / Act
    const description = getColumn('description');
    const imageUrl = getColumn('imageUrl');

    // Assert
    expect(description?.options.nullable).toBe(true);
    expect(imageUrl?.options.nullable).toBe(true);

    expect(getColumn('name')?.options.nullable).not.toBe(true);
    expect(getColumn('price')?.options.nullable).not.toBe(true);
    expect(getColumn('preparationTime')?.options.nullable).not.toBe(true);
  });

  it('TC-KMS-MENU-009: Given MenuItem stock metadata, when inspected, then the approved PostgreSQL enum and default are used', () => {
    // Arrange / Act
    const stockStatus = getColumn('stockStatus');

    // Assert
    expect(stockStatus?.options).toMatchObject({
      name: 'stock_status',
      type: 'enum',
      enum: MenuItemStockStatus,
      enumName: 'menu_item_stock_status',
      default: MenuItemStockStatus.AVAILABLE,
    });
  });

  it('TC-KMS-MENU-010: Given MenuItem category metadata, when inspected, then category_id is a required many-to-one relation', () => {
    // Arrange / Act
    const relation = storage.relations.find(
      (metadata) =>
        metadata.target === MenuItem && metadata.propertyName === 'category',
    );

    const joinColumn = storage.joinColumns.find(
      (metadata) =>
        metadata.target === MenuItem && metadata.propertyName === 'category',
    );

    // Assert
    expect(relation?.relationType).toBe('many-to-one');
    expect(relation?.options.nullable).toBe(false);

    expect(joinColumn?.name).toBe('category_id');
    expect(joinColumn?.referencedColumnName).toBe('categoryId');
  });

  it('TC-KMS-MENU-011: Given normalized menu persistence, when MenuItem columns are inspected, then allergen arrays, dietary arrays, and calorie count are absent', () => {
    // Arrange / Act
    const columnNames = storage.columns
      .filter((column) => column.target === MenuItem)
      .map((column) => column.options.name ?? column.propertyName);

    // Assert
    expect(columnNames).not.toContain('allergen_tags');
    expect(columnNames).not.toContain('dietary_labels');
    expect(columnNames).not.toContain('calorie_count');
  });
});
