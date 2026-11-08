import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { AllergyWarningSnapshot } from '../allergy-safety.policy.js';

@Index('uq_kms_allergy_ack_order_warning', ['orderId', 'warningFingerprint'], {
  unique: true,
})
@Entity({ name: 'kms_order_allergy_acknowledgements' })
export class OrderAllergyAcknowledgement {
  @PrimaryGeneratedColumn('uuid', { name: 'acknowledgement_id' })
  acknowledgementId!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'acknowledged_by', type: 'varchar', length: 255 })
  acknowledgedBy!: string;

  @Column({ name: 'warning_snapshot', type: 'jsonb' })
  warningSnapshot!: AllergyWarningSnapshot;

  @Column({ name: 'warning_fingerprint', type: 'char', length: 64 })
  warningFingerprint!: string;

  @CreateDateColumn({
    name: 'acknowledged_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  acknowledgedAt!: Date;
}
