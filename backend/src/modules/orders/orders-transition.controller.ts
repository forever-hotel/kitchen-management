import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { OrderStatusTransitionResponseDto } from './dto/order-status-transition-response.dto.js';
import { OrdersTransitionService } from './orders-transition.service.js';

@ApiTags('KMS - Food Order Preparation')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid staff session.' })
@ApiForbiddenResponse({
  description: 'Kitchen Staff or Kitchen Manager role required.',
})
@ApiNotFoundResponse({ description: 'Food order not found.' })
@ApiConflictResponse({
  description:
    'Transition is invalid or allergy acknowledgement is still required.',
})
@UseGuards(KmsKitchenReadGuard)
@Controller('api/v1/orders')
export class OrdersTransitionController {
  constructor(private readonly transitions: OrdersTransitionService) {}

  @Post(':orderId/start-preparation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Start preparing a placed order after mandatory allergy acknowledgement',
  })
  @ApiOkResponse({ type: OrderStatusTransitionResponseDto })
  startPreparation(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ): Promise<OrderStatusTransitionResponseDto> {
    return this.transitions.startPreparation(orderId);
  }

  @Post(':orderId/mark-ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an in-preparation order ready for delivery' })
  @ApiOkResponse({ type: OrderStatusTransitionResponseDto })
  markReady(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ): Promise<OrderStatusTransitionResponseDto> {
    return this.transitions.markReady(orderId);
  }
}
