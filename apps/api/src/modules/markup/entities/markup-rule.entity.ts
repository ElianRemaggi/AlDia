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

export enum MarkupScopeType {
  SUPPLIER_PRODUCT = 'supplier_product',
  COMMERCE_PRODUCT = 'commerce_product',
  SUPPLIER = 'supplier',
}

@Entity('markup_rules')
@Index('IDX_markup_rules_commerce_id', ['commerceId'])
export class MarkupRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'commerce_id', type: 'uuid' })
  commerceId!: string;

  @Column({ name: 'scope_type', type: 'enum', enum: MarkupScopeType })
  scopeType!: MarkupScopeType;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId!: string | null;

  @Column({ name: 'supplier_product_id', type: 'uuid', nullable: true })
  supplierProductId!: string | null;

  @Column({ name: 'commerce_product_id', type: 'uuid', nullable: true })
  commerceProductId!: string | null;

  @Column({ name: 'markup_percentage', type: 'decimal', precision: 8, scale: 2 })
  markupPercentage!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Commerce, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: Commerce;
}
