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
import { Supplier } from '../../supplier/entities/supplier.entity';
import { User } from '../../auth/entities/user.entity';

export enum PriceListSourceType {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
  MANUAL = 'manual',
  IMAGE = 'image',
}

export enum PriceListStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  PARTIALLY_PROCESSED = 'partially_processed',
}

@Entity('price_lists')
@Index('IDX_price_list_commerce_id', ['commerceId'])
@Index('IDX_price_list_supplier_id', ['supplierId'])
@Index('IDX_price_list_status', ['status'])
export class PriceList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'commerce_id', type: 'uuid' })
  commerceId!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: PriceListSourceType,
    enumName: 'price_list_source_type_enum',
  })
  sourceType!: PriceListSourceType;

  @Column({ name: 'source_file_url', type: 'text', nullable: true })
  sourceFileUrl!: string | null;

  @Column({ name: 'source_file_name', type: 'varchar', length: 500, nullable: true })
  sourceFileName!: string | null;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid' })
  uploadedByUserId!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PriceListStatus,
    enumName: 'price_list_status_enum',
    default: PriceListStatus.PENDING,
  })
  status!: PriceListStatus;

  @Column({ name: 'version_number', type: 'integer' })
  versionNumber!: number;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate!: string | null;

  @Column({ name: 'uploaded_at', type: 'timestamptz', default: () => 'now()' })
  uploadedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Commerce, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: Commerce;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedByUser!: User;
}
