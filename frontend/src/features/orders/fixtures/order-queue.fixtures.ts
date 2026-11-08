import type { KmsQueueOrder } from '../types/order-queue.types';

/**
 * Demonstration data only.
 *
 * Never expose these records as live hotel orders.
 * No database or Gateway request is performed here.
 */
export function createOrderQueueFixtures(
  referenceTime: Date = new Date(),
): readonly KmsQueueOrder[] {
  if (!Number.isFinite(referenceTime.getTime())) {
    throw new Error('Invalid fixture reference time');
  }

  const minutesAgo = (minutes: number): string =>
    new Date(referenceTime.getTime() - minutes * 60_000).toISOString();

  const minutesAhead = (minutes: number): string =>
    new Date(referenceTime.getTime() + minutes * 60_000).toISOString();

  return [
    {
      orderId: '00000000-0000-4000-8000-000000001001',
      bookingId: '00000000-0000-4000-8000-000000009001',
      orderReference: 'KMS-1001',
      roomNumber: '204',
      mealPeriod: 'LUNCH',
      status: 'PLACED',
      placedAt: minutesAgo(19),
      estimatedDeliveryTime: minutesAhead(25),
      estimatedPreparationMinutes: 25,
      allergyNote: 'Guest reports a peanut allergy.',
      dietaryLabels: [],
      items: [
        {
          orderItemId: '00000000-0000-4000-8001-000000001001',
          menuItemId: '00000000-0000-4000-8002-000000001001',
          name: 'Chicken Fried Rice',
          quantity: 2,
          specialNote: 'Less spicy',
        },
        {
          orderItemId: '00000000-0000-4000-8001-000000001002',
          menuItemId: '00000000-0000-4000-8002-000000001002',
          name: 'Fresh Lime Juice',
          quantity: 2,
          specialNote: null,
        },
      ],
    },
    {
      orderId: '00000000-0000-4000-8000-000000001004',
      bookingId: '00000000-0000-4000-8000-000000009004',
      orderReference: 'KMS-1004',
      roomNumber: '107',
      mealPeriod: 'LUNCH',
      status: 'PLACED',
      placedAt: minutesAgo(7),
      estimatedDeliveryTime: minutesAhead(30),
      estimatedPreparationMinutes: 20,
      allergyNote: null,
      dietaryLabels: ['VEGETARIAN'],
      items: [
        {
          orderItemId: '00000000-0000-4000-8001-000000001004',
          menuItemId: '00000000-0000-4000-8002-000000001004',
          name: 'Vegetable Pasta',
          quantity: 1,
          specialNote: 'No cheese',
        },
      ],
    },
    {
      orderId: '00000000-0000-4000-8000-000000000998',
      bookingId: '00000000-0000-4000-8000-000000009998',
      orderReference: 'KMS-0998',
      roomNumber: '302',
      mealPeriod: 'LUNCH',
      status: 'IN_PREPARATION',
      placedAt: minutesAgo(29),
      estimatedDeliveryTime: minutesAhead(15),
      estimatedPreparationMinutes: 30,
      allergyNote: null,
      dietaryLabels: [],
      items: [
        {
          orderItemId: '00000000-0000-4000-8001-000000000998',
          menuItemId: '00000000-0000-4000-8002-000000000998',
          name: 'Seafood Noodles',
          quantity: 2,
          specialNote: null,
        },
      ],
    },
    {
      orderId: '00000000-0000-4000-8000-000000001000',
      bookingId: '00000000-0000-4000-8000-000000009000',
      orderReference: 'KMS-1000',
      roomNumber: '108',
      mealPeriod: 'BREAKFAST',
      status: 'READY',
      placedAt: minutesAgo(35),
      estimatedDeliveryTime: minutesAhead(5),
      estimatedPreparationMinutes: 20,
      allergyNote: null,
      dietaryLabels: [],
      items: [
        {
          orderItemId: '00000000-0000-4000-8001-000000001000',
          menuItemId: '00000000-0000-4000-8002-000000001000',
          name: 'Club Sandwich',
          quantity: 1,
          specialNote: null,
        },
      ],
    },
    {
      orderId: '00000000-0000-4000-8000-000000000976',
      bookingId: '00000000-0000-4000-8000-000000009976',
      orderReference: 'KMS-0976',
      roomNumber: '105',
      mealPeriod: 'BREAKFAST',
      status: 'DELIVERED',
      placedAt: minutesAgo(62),
      estimatedDeliveryTime: null,
      estimatedPreparationMinutes: null,
      allergyNote: null,
      dietaryLabels: [],
      items: [
        {
          orderItemId: '00000000-0000-4000-8001-000000000976',
          menuItemId: '00000000-0000-4000-8002-000000000976',
          name: 'English Breakfast',
          quantity: 1,
          specialNote: null,
        },
      ],
    },
    {
      orderId: '00000000-0000-4000-8000-000000000975',
      bookingId: '00000000-0000-4000-8000-000000009975',
      orderReference: 'KMS-0975',
      roomNumber: '203',
      mealPeriod: 'BREAKFAST',
      status: 'CANCELLED',
      placedAt: minutesAgo(68),
      estimatedDeliveryTime: null,
      estimatedPreparationMinutes: null,
      allergyNote: null,
      dietaryLabels: [],
      items: [
        {
          orderItemId: '00000000-0000-4000-8001-000000000975',
          menuItemId: '00000000-0000-4000-8002-000000000975',
          name: 'Pancakes',
          quantity: 1,
          specialNote: null,
        },
      ],
    },
  ];
}
