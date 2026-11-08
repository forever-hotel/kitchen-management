import { MenuLookupsController } from './menu-lookups.controller.js';
import type { AllergenRepository } from './repositories/allergen.repository.js';
import type { DietaryLabelRepository } from './repositories/dietary-label.repository.js';

describe('DDP-257 manager menu tag lookup', () => {
  it('returns database IDs and names without exposing entities or fixture data', async () => {
    const allergens = {
      findAll: async () => [
        { allergenId: 'allergen-1', name: 'Eggs', internalField: 'no' },
      ],
    } as unknown as AllergenRepository;
    const dietaryLabels = {
      findAll: async () => [
        { dietaryLabelId: 'diet-1', name: 'Vegan', internalField: 'no' },
      ],
    } as unknown as DietaryLabelRepository;
    const controller = new MenuLookupsController(allergens, dietaryLabels);
    await expect(controller.tags()).resolves.toEqual({
      allergens: [{ allergenId: 'allergen-1', name: 'Eggs' }],
      dietaryLabels: [{ dietaryLabelId: 'diet-1', name: 'Vegan' }],
    });
  });
});
