import { getMetadataArgsStorage } from 'typeorm';

import { Allergen } from './allergen.entity.js';

describe('Allergen entity', () => {
  const storage = getMetadataArgsStorage();

  const getColumn = (propertyName: string) =>
    storage.columns.find(
      (column) =>
        column.target === Allergen && column.propertyName === propertyName,
    );

  it('TC-KMS-MENU-018: Given Allergen metadata, when inspected, then it maps to the approved KMS allergen table', () => {
    // Arrange / Act
    const table = storage.tables.find(
      (metadata) => metadata.target === Allergen,
    );

    // Assert
    expect(table?.name).toBe('kms_allergens');
  });

  it('TC-KMS-MENU-019: Given Allergen metadata, when columns are inspected, then the UUID key and unique name are mapped', () => {
    // Arrange / Act
    const allergenId = getColumn('allergenId');
    const name = getColumn('name');

    const generation = storage.generations.find(
      (metadata) =>
        metadata.target === Allergen && metadata.propertyName === 'allergenId',
    );

    // Assert
    expect(allergenId?.options.name).toBe('allergen_id');
    expect(allergenId?.options.primary).toBe(true);
    expect(generation?.strategy).toBe('uuid');

    expect(name?.options).toMatchObject({
      name: 'name',
      type: 'varchar',
      length: 100,
      unique: true,
    });
  });

  it('TC-KMS-MENU-020: Given normalized allergen persistence, when relations are inspected, then Allergen has a many-to-many relation to MenuItem', () => {
    // Arrange / Act
    const relation = storage.relations.find(
      (metadata) =>
        metadata.target === Allergen && metadata.propertyName === 'menuItems',
    );

    // Assert
    expect(relation?.relationType).toBe('many-to-many');
  });
});
