import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { Allergen } from '../entities/allergen.entity.js';
import { AllergenRepository } from './allergen.repository.js';

describe('AllergenRepository', () => {
  it('TC-KMS-MENU-026: Given persisted allergens, when all allergens are requested, then they are retrieved alphabetically', async () => {
    // Arrange
    const allergens = [
      {
        allergenId: 'allergen-1',
        name: 'Dairy',
      },
    ] as Allergen[];

    const typeOrmRepository = {
      find: jest.fn<() => Promise<Allergen[]>>().mockResolvedValue(allergens),
    } as unknown as Repository<Allergen>;

    const repository = new AllergenRepository(typeOrmRepository);

    // Act
    const result = await repository.findAll();

    // Assert
    expect(result).toBe(allergens);
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      order: {
        name: 'ASC',
      },
    });
  });

  it('TC-KMS-MENU-027: Given an allergen identifier, when the allergen is requested, then only that identifier is queried', async () => {
    // Arrange
    const allergen = {
      allergenId: 'allergen-1',
      name: 'Dairy',
    } as Allergen;

    const typeOrmRepository = {
      findOne: jest
        .fn<() => Promise<Allergen | null>>()
        .mockResolvedValue(allergen),
    } as unknown as Repository<Allergen>;

    const repository = new AllergenRepository(typeOrmRepository);

    // Act
    const result = await repository.findById('allergen-1');

    // Assert
    expect(result).toBe(allergen);
    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        allergenId: 'allergen-1',
      },
    });
  });
});
