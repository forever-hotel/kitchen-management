import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KmsOrderIntakeGuard } from '../common/guards/kms-order-intake.guard.js';
import { GuestKitchenService } from './guest-kitchen.service.js';

/** Server-to-server contract. Never accepts a browser/guest token as service identity. */
@Controller('api/v1/guest')
@UseGuards(KmsOrderIntakeGuard)
export class GuestKitchenController {
  constructor(private readonly kitchen: GuestKitchenService) {}

  @Get('menu')
  menu(@Query('mealPeriod') mealPeriod?: string) {
    return this.kitchen.menu(mealPeriod);
  }

  @Post('orders')
  create(@Body() body: unknown) {
    return this.kitchen.create(body);
  }

  @Get('orders/:id')
  order(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.kitchen.order(id);
  }

  @Post('orders/:id/cancel')
  cancel(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.kitchen.cancel(id);
  }
}
