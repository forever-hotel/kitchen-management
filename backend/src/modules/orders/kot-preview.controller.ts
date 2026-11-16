import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { KotPreviewDto } from './dto/kot-preview.dto.js';
import { KotPreviewService } from './kot-preview.service.js';

@ApiTags('KMS - Kitchen Order Tickets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Verified staff session required.' })
@ApiForbiddenResponse({
  description: 'Kitchen Manager or Kitchen Staff access required.',
})
@UseGuards(KmsKitchenReadGuard)
@Controller('api/v1/orders')
export class KotPreviewController {
  constructor(private readonly tickets: KotPreviewService) {}

  @Get(':orderId/kot-preview')
  @ApiOperation({
    summary: 'Read-only KOT content from persisted food-order snapshots',
    description:
      'Preview only. Does not create a print job or confirm physical printing.',
  })
  @ApiBadRequestResponse({ description: 'Malformed order UUID.' })
  @ApiNotFoundResponse({ description: 'Food order not found.' })
  @ApiOkResponse({ type: KotPreviewDto })
  preview(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ): Promise<KotPreviewDto> {
    return this.tickets.preview(orderId);
  }
}
