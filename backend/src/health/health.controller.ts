import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

interface HealthResponse {
  status: 'ok';
  service: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get('live')
  @ApiOperation({
    summary: 'Check whether the KMS backend process is alive',
  })
  @ApiOkResponse({
    description: 'The KMS backend process is alive.',
    schema: {
      example: {
        status: 'ok',
        service: 'kms-backend',
      },
    },
  })
  getLiveness(): HealthResponse {
    return {
      status: 'ok',
      service: 'kms-backend',
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Check whether the KMS backend is ready to receive requests',
  })
  @ApiOkResponse({
    description: 'The KMS backend has completed application startup.',
    schema: {
      example: {
        status: 'ok',
        service: 'kms-backend',
      },
    },
  })
  getReadiness(): HealthResponse {
    return {
      status: 'ok',
      service: 'kms-backend',
    };
  }
}
