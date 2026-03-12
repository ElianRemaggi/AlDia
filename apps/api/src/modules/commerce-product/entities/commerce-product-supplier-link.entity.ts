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
import { CommerceProduct } from './commerce-product.entity';
import { SupplierProduct } from '../../import/entities/supplier-product.entity';

@Entity('commerce_product_supplier_links')
@Index('IDX_cpsl_commerce_id', ['commerceId'])
@Index('IDX_cpsl_supplier_product_id', ['supplierProductId'])
@Index('IDX_cpsl_is_favorite', ['isFavorite'])
export class CommerceProductSupplierLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'commerce_id', type: 'uuid' })
  commerceId!: string;

  @Column({ name: 'commerce_product_id', type: 'uuid', nullable: true })
  commerceProductId!: string | null;

  @Column({ name: 'supplier_product_id', type: 'uuid' })
  supplierProductId!: string;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  isFavorite!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Commerce, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: Commerce;

  @ManyToOne(() => CommerceProduct, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'commerce_product_id' })
  commerceProduct!: CommerceProduct | null;

  @ManyToOne(() => SupplierProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_product_id' })
  supplierProduct!: SupplierProduct;
}
