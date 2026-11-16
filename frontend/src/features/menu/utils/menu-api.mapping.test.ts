import { mapMenuCategories, mapMenuItems, mapMenuLookupOptions } from './menu-api.mapping';

describe('DDP-257 KMS manager API mapping', () => {
  it('maps persisted menu categories and items with real tag IDs', () => {
    expect(
      mapMenuCategories([
        {
          categoryId: 'cat-1',
          name: 'Lunch',
          orderStartTime: '11:30:00',
          orderCutoffTime: '14:30:00',
        },
      ])[0].name,
    ).toBe('Lunch');

    const items = mapMenuItems([
      {
        menuItemId: 'item-1',
        categoryId: 'cat-1',
        name: 'Rice',
        description: null,
        price: 1650,
        preparationTime: 20,
        portionLimit: 4,
        stockStatus: 'LOW_STOCK',
        imageUrl: null,
        allergens: [{ allergenId: 'a-1', name: 'Soy' }],
        dietaryLabels: [{ dietaryLabelId: 'd-1', name: 'Vegan' }],
      },
    ]);
    expect(items[0].stockStatus).toBe('LOW_STOCK');
    expect(items[0].allergens).toEqual([{ allergenId: 'a-1', name: 'Soy' }]);
  });

  it('rejects invalid or incomplete upstream payloads instead of faking success', () => {
    expect(() => mapMenuCategories({})).toThrow();
    expect(() => mapMenuItems([{ name: 'No ID' }])).toThrow();
    expect(() => mapMenuItems([{ stockStatus: 'NOT_A_STATUS' }])).toThrow();
  });

  it('does not invent missing allergen or dietary records', () => {
    expect(mapMenuLookupOptions({ allergens: [], dietaryLabels: [] })).toEqual({
      allergens: [],
      dietaryLabels: [],
    });
    expect(() => mapMenuLookupOptions({ allergens: [] })).toThrow();
  });
});
