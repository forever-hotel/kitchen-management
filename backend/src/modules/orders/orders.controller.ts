import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { FoodOrderResponseDto } from './dto/order-response.dto.js';
import { OrderQueueResponseDto } from './dto/order-queue-response.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('KMS - Food Orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing or invalid Gateway staff session.',
})
@ApiForbiddenResponse({
  description: 'Kitchen Staff or Kitchen Manager access is required.',
})
@UseGuards(KmsKitchenReadGuard)
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List active kitchen orders, oldest first' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PLACED', 'IN_PREPARATION', 'READY'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiBadRequestResponse({
    description: 'Invalid status or pagination values.',
  })
  @ApiOkResponse({ type: OrderQueueResponseDto })
  listQueue(
    @Query() query: Record<string, unknown>,
  ): Promise<OrderQueueResponseDto> {
    return this.orders.listQueue(query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Read a food order with saved line-item snapshots' })
  @ApiBadRequestResponse({ description: 'Malformed food order UUID.' })
  @ApiNotFoundResponse({ description: 'Food order does not exist.' })
  @ApiOkResponse({ type: FoodOrderResponseDto })
  getDetails(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ): Promise<FoodOrderResponseDto> {
    return this.orders.getDetails(orderId);
  }
}
