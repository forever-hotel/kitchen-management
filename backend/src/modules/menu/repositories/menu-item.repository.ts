import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MenuItem } from '../entities/menu-item.entity.js';

const requiredReadRelations = {
  category: true,
  allergens: true,
  dietaryLabels: true,
} as const;

@Injectable()
export class MenuItemRepository {
  constructor(
    @InjectRepository(MenuItem)
    private readonly repository: Repository<MenuItem>,
  ) {}

  findAll(): Promise<MenuItem[]> {
    return this.repository.find({
      relations: requiredReadRelations,
      order: {
        name: 'ASC',
      },
    });
  }

  findById(menuItemId: string): Promise<MenuItem | null> {
    return this.repository.findOne({
      where: { menuItemId },
      relations: requiredReadRelations,
    });
  }
}
