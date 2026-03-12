import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Commerce } from '../../commerce/entities/commerce.entity';

// Note: conditional unique index (commerce_id, supplier_code) WHERE supplier_code IS NOT NULL
// is created in the migration, not via decorator (TypeORM doesn't support conditional uniques)
@Entity('suppliers')
@Index('IDX_supplier_commerce_id', ['commerceId'])
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'commerce_id', type: 'uuid' })
  commerceId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'supplier_code', type: 'varchar', length: 100, nullable: true })
  supplierCode!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 255, nullable: true })
  contactName!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Commerce, (commerce) => commerce.suppliers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: Commerce;
}
