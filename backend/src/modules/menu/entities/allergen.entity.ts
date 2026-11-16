import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { MenuItem } from './menu-item.entity.js';

@Entity({ name: 'kms_allergens' })
export class Allergen {
  @PrimaryGeneratedColumn('uuid', {
    name: 'allergen_id',
  })
  allergenId!: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name!: string;

  @ManyToMany(() => MenuItem, (menuItem) => menuItem.allergens)
  menuItems!: Relation<MenuItem[]>;
}
