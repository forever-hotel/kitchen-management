import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MenuItem } from './entities/menu-item.entity.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem])],
  providers: [MenuItemRepository],
  exports: [MenuItemRepository],
})
export class MenuModule {}
