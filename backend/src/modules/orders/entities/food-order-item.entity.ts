import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import type { MenuItem } from '../../menu/entities/menu-item.entity.js';
import type { FoodOrder } from './food-order.entity.js';

@Check('"quantity" > 0')
@Check('"unit_price" > 0')
@Entity({ name: 'kms_food_order_items' })
export class FoodOrderItem {
  @PrimaryGeneratedColumn('uuid', {
    name: 'order_item_id',
  })
  orderItemId!: string;

  @Column({
    name: 'order_id',
    type: 'uuid',
  })
  orderId!: string;

  @Column({
    name: 'menu_item_id',
    type: 'uuid',
  })
  menuItemId!: string;

  /*
   * Snapshot of the menu-item name at order time so historical orders are
   * unaffected by later menu changes.
   */
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
  })
  name!: string;

  @Column({
    name: 'quantity',
    type: 'integer',
  })
  quantity!: number;

  /*
   * Snapshot of the integer menu-item price at order time.
   */
  @Column({
    name: 'unit_price',
    type: 'integer',
  })
  unitPrice!: number;

  @Column({
    name: 'special_note',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  specialNote!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne('FoodOrder', 'items', {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'order_id',
    referencedColumnName: 'orderId',
  })
  order!: Relation<FoodOrder>;

  @ManyToOne('MenuItem', {
    nullable: false,
  })
  @JoinColumn({
    name: 'menu_item_id',
    referencedColumnName: 'menuItemId',
  })
  menuItem!: Relation<MenuItem>;
}
