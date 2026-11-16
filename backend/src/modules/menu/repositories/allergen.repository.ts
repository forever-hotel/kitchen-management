import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Allergen } from '../entities/allergen.entity.js';

@Injectable()
export class AllergenRepository {
  constructor(
    @InjectRepository(Allergen)
    private readonly repository: Repository<Allergen>,
  ) {}

  findAll(): Promise<Allergen[]> {
    return this.repository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  findById(allergenId: string): Promise<Allergen | null> {
    return this.repository.findOne({
      where: {
        allergenId,
      },
    });
  }
}
