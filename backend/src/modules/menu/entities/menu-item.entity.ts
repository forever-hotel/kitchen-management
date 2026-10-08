import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { MealCategory } from '../../menu-categories/entities/meal-category.entity.js';
import { MenuItemStockStatus } from '../enums/menu-item-stock-status.enum.js';
import { Allergen } from './allergen.entity.js';
import { DietaryLabel } from './dietary-label.entity.js';

@Entity({ name: 'kms_menu_items' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid', {
    name: 'menu_item_id',
  })
  menuItemId!: string;

  @Column({
    name: 'category_id',
    type: 'uuid',
  })
  categoryId!: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'price',
    type: 'integer',
  })
  price!: number;

  @Column({
    name: 'preparation_time',
    type: 'integer',
  })
  preparationTime!: number;

  @Column({
    name: 'portion_limit',
    type: 'integer',
    default: 5,
  })
  portionLimit!: number;

  @Column({
    name: 'stock_status',
    type: 'enum',
    enum: MenuItemStockStatus,
    enumName: 'menu_item_stock_status',
    default: MenuItemStockStatus.AVAILABLE,
  })
  stockStatus!: MenuItemStockStatus;

  @Column({
    name: 'image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  imageUrl!: string | null;

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

  @ManyToOne(() => MealCategory, (category) => category.menuItems, {
    nullable: false,
  })
  @JoinColumn({
    name: 'category_id',
    referencedColumnName: 'categoryId',
  })
  category!: Relation<MealCategory>;

  @ManyToMany(() => Allergen, (allergen) => allergen.menuItems)
  @JoinTable({
    name: 'kms_menu_item_allergens',
    joinColumn: {
      name: 'menu_item_id',
      referencedColumnName: 'menuItemId',
    },
    inverseJoinColumn: {
      name: 'allergen_id',
      referencedColumnName: 'allergenId',
    },
  })
  allergens!: Relation<Allergen[]>;

  @ManyToMany(() => DietaryLabel, (dietaryLabel) => dietaryLabel.menuItems)
  @JoinTable({
    name: 'kms_menu_item_dietary_labels',
    joinColumn: {
      name: 'menu_item_id',
      referencedColumnName: 'menuItemId',
    },
    inverseJoinColumn: {
      name: 'dietary_label_id',
      referencedColumnName: 'dietaryLabelId',
    },
  })
  dietaryLabels!: Relation<DietaryLabel[]>;
}
