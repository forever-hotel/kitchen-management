import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { MenuItem } from './menu-item.entity.js';

@Entity({ name: 'kms_dietary_labels' })
export class DietaryLabel {
  @PrimaryGeneratedColumn('uuid', {
    name: 'dietary_label_id',
  })
  dietaryLabelId!: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name!: string;

  @ManyToMany(() => MenuItem, (menuItem) => menuItem.dietaryLabels)
  menuItems!: Relation<MenuItem[]>;
}
