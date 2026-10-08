import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DietaryLabel } from '../entities/dietary-label.entity.js';

@Injectable()
export class DietaryLabelRepository {
  constructor(
    @InjectRepository(DietaryLabel)
    private readonly repository: Repository<DietaryLabel>,
  ) {}

  findAll(): Promise<DietaryLabel[]> {
    return this.repository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  findById(dietaryLabelId: string): Promise<DietaryLabel | null> {
    return this.repository.findOne({
      where: {
        dietaryLabelId,
      },
    });
  }
}
