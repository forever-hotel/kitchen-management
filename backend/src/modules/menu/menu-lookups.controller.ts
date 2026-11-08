import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { AllergenRepository } from './repositories/allergen.repository.js';
import { DietaryLabelRepository } from './repositories/dietary-label.repository.js';

/** Reference-data endpoint for real UUID-backed Add/Edit Menu tag choices. */
@ApiTags('KMS Manager - Menu Lookup Data')
@ApiBearerAuth()
@UseGuards(KmsManagerReadGuard)
@Controller(['api/v1/menu/lookups', 'kms/api/v1/menu/lookups'])
export class MenuLookupsController {
  constructor(
    private readonly allergens: AllergenRepository,
    private readonly dietaryLabels: DietaryLabelRepository,
  ) {}

  @Get('tags')
  @ApiOperation({
    summary: 'List authorized allergen and dietary-label choices',
  })
  @ApiOkResponse({
    description: 'Allergen and dietary-label arrays with persistent UUIDs',
  })
  async tags(): Promise<{
    allergens: { allergenId: string; name: string }[];
    dietaryLabels: { dietaryLabelId: string; name: string }[];
  }> {
    const [allergens, dietaryLabels] = await Promise.all([
      this.allergens.findAll(),
      this.dietaryLabels.findAll(),
    ]);
    return {
      allergens: allergens.map(({ allergenId, name }) => ({
        allergenId,
        name,
      })),
      dietaryLabels: dietaryLabels.map(({ dietaryLabelId, name }) => ({
        dietaryLabelId,
        name,
      })),
    };
  }
}
