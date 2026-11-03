import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { Allergen } from './entities/allergen.entity.js';
import { DietaryLabel } from './entities/dietary-label.entity.js';
import { MenuItem } from './entities/menu-item.entity.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';
import { AllergenRepository } from './repositories/allergen.repository.js';
import { DietaryLabelRepository } from './repositories/dietary-label.repository.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem, Allergen, DietaryLabel])],
  controllers: [MenuController],
  providers: [
    MenuService,
    MenuItemRepository,
    AllergenRepository,
    DietaryLabelRepository,
    KmsManagerReadGuard,
  ],
  exports: [MenuItemRepository, AllergenRepository, DietaryLabelRepository],
})
export class MenuModule {}
