import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { MenuItem } from '../../menu/entities/menu-item.entity.js';

@Entity({ name: 'kms_meal_categories' })
export class MealCategory {
  @PrimaryGeneratedColumn('uuid', {
    name: 'category_id',
  })
  categoryId!: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name!: string;

  @Column({
    name: 'order_start_time',
    type: 'time',
  })
  orderStartTime!: string;

  @Column({
    name: 'order_cutoff_time',
    type: 'time',
  })
  orderCutoffTime!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @OneToMany(() => MenuItem, (menuItem: MenuItem) => menuItem.category)
  menuItems!: Relation<MenuItem[]>;
}
