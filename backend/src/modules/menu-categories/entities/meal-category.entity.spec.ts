import { getMetadataArgsStorage } from 'typeorm';

import { MealCategory } from './meal-category.entity.js';

describe('MealCategory entity', () => {
  const storage = getMetadataArgsStorage();

  const getColumn = (propertyName: string) =>
    storage.columns.find(
      (column) =>
        column.target === MealCategory && column.propertyName === propertyName,
    );

  it('TC-KMS-MENU-002: Given MealCategory metadata, when inspected, then it maps to the approved KMS table', () => {
    // Arrange / Act
    const table = storage.tables.find(
      (metadata) => metadata.target === MealCategory,
    );

    // Assert
    expect(table?.name).toBe('kms_meal_categories');
  });

  it('TC-KMS-MENU-003: Given MealCategory metadata, when columns are inspected, then approved fields are mapped', () => {
    // Arrange / Act
    const categoryId = getColumn('categoryId');
    const name = getColumn('name');
    const orderStartTime = getColumn('orderStartTime');
    const orderCutoffTime = getColumn('orderCutoffTime');

    // Assert
    expect(categoryId?.options.name).toBe('category_id');
    expect(categoryId?.options.primary).toBe(true);

    expect(name?.options).toMatchObject({
      name: 'name',
      type: 'varchar',
      length: 100,
      unique: true,
    });

    expect(orderStartTime?.options).toMatchObject({
      name: 'order_start_time',
      type: 'time',
    });

    expect(orderCutoffTime?.options).toMatchObject({
      name: 'order_cutoff_time',
      type: 'time',
    });
  });

  it('TC-KMS-MENU-004: Given MealCategory metadata, when key generation is inspected, then the primary key uses UUID generation', () => {
    // Arrange / Act
    const generation = storage.generations.find(
      (metadata) =>
        metadata.target === MealCategory &&
        metadata.propertyName === 'categoryId',
    );

    // Assert
    expect(generation?.strategy).toBe('uuid');
  });

  it('TC-KMS-MENU-005: Given MealCategory metadata, when relations are inspected, then it exposes MenuItems as one-to-many', () => {
    // Arrange / Act
    const relation = storage.relations.find(
      (metadata) =>
        metadata.target === MealCategory &&
        metadata.propertyName === 'menuItems',
    );

    // Assert
    expect(relation?.relationType).toBe('one-to-many');
  });
});
