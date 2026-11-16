import { OrdersModule } from './orders.module.js';

describe('OrdersModule', () => {
  it('TC-KMS-ORDER-022: Given the KMS module structure, when OrdersModule is loaded, then it is defined', () => {
    // Arrange / Act / Assert
    expect(OrdersModule).toBeDefined();
  });
});
