import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { AllergySafetyService } from './allergy-safety.service.js';
import { OrderAllergySafetyResponseDto } from './dto/order-allergy-safety-response.dto.js';

interface VerifiedKitchenRequest {
  kmsStaff?: { sub: string; role: string };
}

@ApiTags('KMS - Food Order Allergy Safety')
@ApiBearerAuth()
@UseGuards(KmsKitchenReadGuard)
@Controller('api/v1/orders/:orderId/allergy-safety')
export class AllergySafetyController {
  constructor(private readonly allergySafety: AllergySafetyService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current allergy warnings and acknowledgement evidence',
  })
  @ApiOkResponse({ type: OrderAllergySafetyResponseDto })
  getSafety(@Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.allergySafety.getSafety(orderId);
  }

  @Post('acknowledgements')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Acknowledge current warnings as the verified kitchen employee',
  })
  @ApiConflictResponse({
    description: 'Preparation already started or order state changed.',
  })
  @ApiOkResponse({ type: OrderAllergySafetyResponseDto })
  acknowledge(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Req() request: VerifiedKitchenRequest,
  ) {
    if (!request.kmsStaff) {
      throw new UnauthorizedException(
        'Verified kitchen staff identity is required',
      );
    }
    return this.allergySafety.acknowledge(orderId, request.kmsStaff.sub);
  }
}
