import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { DietaryLabel } from '../entities/dietary-label.entity.js';
import { DietaryLabelRepository } from './dietary-label.repository.js';

describe('DietaryLabelRepository', () => {
  it('TC-KMS-MENU-028: Given persisted dietary labels, when all labels are requested, then they are retrieved alphabetically', async () => {
    // Arrange
    const dietaryLabels = [
      {
        dietaryLabelId: 'dietary-label-1',
        name: 'Vegetarian',
      },
    ] as DietaryLabel[];

    const typeOrmRepository = {
      find: jest
        .fn<() => Promise<DietaryLabel[]>>()
        .mockResolvedValue(dietaryLabels),
    } as unknown as Repository<DietaryLabel>;

    const repository = new DietaryLabelRepository(typeOrmRepository);

    // Act
    const result = await repository.findAll();

    // Assert
    expect(result).toBe(dietaryLabels);
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      order: {
        name: 'ASC',
      },
    });
  });

  it('TC-KMS-MENU-029: Given a dietary-label identifier, when the label is requested, then only that identifier is queried', async () => {
    // Arrange
    const dietaryLabel = {
      dietaryLabelId: 'dietary-label-1',
      name: 'Vegetarian',
    } as DietaryLabel;

    const typeOrmRepository = {
      findOne: jest
        .fn<() => Promise<DietaryLabel | null>>()
        .mockResolvedValue(dietaryLabel),
    } as unknown as Repository<DietaryLabel>;

    const repository = new DietaryLabelRepository(typeOrmRepository);

    // Act
    const result = await repository.findById('dietary-label-1');

    // Assert
    expect(result).toBe(dietaryLabel);
    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        dietaryLabelId: 'dietary-label-1',
      },
    });
  });
});
