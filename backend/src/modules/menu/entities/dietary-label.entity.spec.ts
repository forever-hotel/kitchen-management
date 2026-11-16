import { getMetadataArgsStorage } from 'typeorm';

import { DietaryLabel } from './dietary-label.entity.js';

describe('DietaryLabel entity', () => {
  const storage = getMetadataArgsStorage();

  const getColumn = (propertyName: string) =>
    storage.columns.find(
      (column) =>
        column.target === DietaryLabel && column.propertyName === propertyName,
    );

  it('TC-KMS-MENU-021: Given DietaryLabel metadata, when inspected, then it maps to the approved KMS dietary-label table', () => {
    // Arrange / Act
    const table = storage.tables.find(
      (metadata) => metadata.target === DietaryLabel,
    );

    // Assert
    expect(table?.name).toBe('kms_dietary_labels');
  });

  it('TC-KMS-MENU-022: Given DietaryLabel metadata, when columns are inspected, then the UUID key and unique name are mapped', () => {
    // Arrange / Act
    const dietaryLabelId = getColumn('dietaryLabelId');
    const name = getColumn('name');

    const generation = storage.generations.find(
      (metadata) =>
        metadata.target === DietaryLabel &&
        metadata.propertyName === 'dietaryLabelId',
    );

    // Assert
    expect(dietaryLabelId?.options.name).toBe('dietary_label_id');
    expect(dietaryLabelId?.options.primary).toBe(true);
    expect(generation?.strategy).toBe('uuid');

    expect(name?.options).toMatchObject({
      name: 'name',
      type: 'varchar',
      length: 100,
      unique: true,
    });
  });

  it('TC-KMS-MENU-023: Given normalized dietary-label persistence, when relations are inspected, then DietaryLabel has a many-to-many relation to MenuItem', () => {
    // Arrange / Act
    const relation = storage.relations.find(
      (metadata) =>
        metadata.target === DietaryLabel &&
        metadata.propertyName === 'menuItems',
    );

    // Assert
    expect(relation?.relationType).toBe('many-to-many');
  });
});
