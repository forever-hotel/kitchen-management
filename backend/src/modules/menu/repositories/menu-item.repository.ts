import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MenuItem } from '../entities/menu-item.entity.js';

@Injectable()
export class MenuItemRepository {
  constructor(
    @InjectRepository(MenuItem)
    private readonly repository: Repository<MenuItem>,
  ) {}

  findAll(): Promise<MenuItem[]> {
    return this.repository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  findById(menuItemId: string): Promise<MenuItem | null> {
    return this.repository.findOne({
      where: {
        menuItemId,
      },
    });
  }
}
