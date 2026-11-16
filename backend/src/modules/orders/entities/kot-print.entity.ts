import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { KotPrintStatus } from '../enums/kot-print-status.enum.js';
import type { FoodOrder } from './food-order.entity.js';

@Check(
  'chk_kot_printed_at',
  `"print_status" <> 'PRINTED' OR "printed_at" IS NOT NULL`,
)
@Check(
  'chk_kot_cancellation_consistency',
  `"is_cancelled" = ("print_status" = 'CANCELLED')`,
)
@Index('idx_kot_prints_order', ['orderId'])
@Index('idx_kot_prints_status', ['printStatus'])
@Entity({ name: 'kms_kot_prints' })
export class KotPrint {
  @PrimaryGeneratedColumn('uuid', { name: 'kot_id' })
  kotId!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({
    name: 'print_status',
    type: 'enum',
    enum: KotPrintStatus,
    enumName: 'kot_print_status',
    default: KotPrintStatus.PENDING,
  })
  printStatus!: KotPrintStatus;

  @Column({ name: 'printed_at', type: 'timestamptz', nullable: true })
  printedAt!: Date | null;

  @Column({ name: 'is_cancelled', type: 'boolean', default: false })
  isCancelled!: boolean;

  // Confirm printer_name.character_maximum_length using the included SQL check.
  @Column({
    name: 'printer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  printerName!: string | null;

  @Column({ name: 'reprinted_at', type: 'timestamptz', nullable: true })
  reprintedAt!: Date | null;

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

  @ManyToOne('FoodOrder', 'kotPrints', {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'orderId' })
  order!: Relation<FoodOrder>;
}
