import {
  Controller,
  Get,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { KotPrintJobsService } from './kot-print-jobs.service.js';

@ApiTags('KMS - KOT Print Job Requests')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'A verified staff session is required.',
})
@ApiForbiddenResponse({
  description: 'Kitchen staff or manager role required.',
})
@ApiNotFoundResponse({ description: 'Food order or print job was not found.' })
@ApiConflictResponse({
  description: 'Request conflicts with the current persisted state.',
})
@UseGuards(KmsKitchenReadGuard)
@Controller('api/v1/orders/:orderId/kot-print-jobs')
export class KotPrintJobsController {
  constructor(private readonly jobs: KotPrintJobsService) {}

  @Get()
  @ApiOperation({
    summary: 'Read persisted KOT print-job history for an order',
  })
  list(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.jobs.list(orderId);
  }

  @Get(':kotId')
  @ApiOperation({
    summary: 'Read one print job belonging to the specified order',
  })
  get(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Param('kotId', new ParseUUIDPipe()) kotId: string,
  ) {
    return this.jobs.get(orderId, kotId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record a pending print request (does NOT send it to a printer)',
  })
  request(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.jobs.request(orderId);
  }

  @Post(':kotId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending print request' })
  cancel(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Param('kotId', new ParseUUIDPipe()) kotId: string,
  ) {
    return this.jobs.cancel(orderId, kotId);
  }
}
