import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { DatabaseHealthService } from '../database/database-health.service.js';

interface HealthResponse {
  status: 'ok';
  service: string;
}

interface ReadinessResponse extends HealthResponse {
  dependencies: {
    database: 'up';
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly databaseHealthService: DatabaseHealthService) {}

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
    summary:
      'Check whether the KMS backend and required dependencies are ready',
  })
  @ApiOkResponse({
    description: 'The KMS backend and PostgreSQL dependency are ready.',
    schema: {
      example: {
        status: 'ok',
        service: 'kms-backend',
        dependencies: {
          database: 'up',
        },
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'A required KMS dependency is unavailable.',
    schema: {
      example: {
        status: 'error',
        service: 'kms-backend',
        dependencies: {
          database: 'down',
        },
      },
    },
  })
  async getReadiness(): Promise<ReadinessResponse> {
    const databaseReady = await this.databaseHealthService.isReady();

    if (!databaseReady) {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'kms-backend',
        dependencies: {
          database: 'down',
        },
      });
    }

    return {
      status: 'ok',
      service: 'kms-backend',
      dependencies: {
        database: 'up',
      },
    };
  }
}
