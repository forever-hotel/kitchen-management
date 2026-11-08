import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { KmsOrderIntakeGuard } from '../../common/guards/kms-order-intake.guard.js';
import { CreateOrderResponseDto } from './dto/create-order-response.dto.js';
import { OrdersCreateService } from './orders-create.service.js';

@ApiTags('KMS - Food Order Intake')
@ApiBearerAuth()
@UseGuards(KmsOrderIntakeGuard)
@Controller('api/v1/orders')
export class OrdersCreateController {
  constructor(private readonly ordersCreate: OrdersCreateService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an order atomically with idempotent retries',
  })
  @ApiCreatedResponse({ type: CreateOrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid order data, menu availability or ordering window.',
  })
  @ApiConflictResponse({
    description: 'Idempotency key was reused with a different request.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing intake credential.',
  })
  create(@Body() payload: unknown): Promise<CreateOrderResponseDto> {
    return this.ordersCreate.createOrder(payload);
  }
}
