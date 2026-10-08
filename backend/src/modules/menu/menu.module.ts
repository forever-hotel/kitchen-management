import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Allergen } from './entities/allergen.entity.js';
import { DietaryLabel } from './entities/dietary-label.entity.js';
import { MenuItem } from './entities/menu-item.entity.js';
import { AllergenRepository } from './repositories/allergen.repository.js';
import { DietaryLabelRepository } from './repositories/dietary-label.repository.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem, Allergen, DietaryLabel])],
  providers: [MenuItemRepository, AllergenRepository, DietaryLabelRepository],
  exports: [MenuItemRepository, AllergenRepository, DietaryLabelRepository],
})
export class MenuModule {}
