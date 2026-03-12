import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Commerce } from '../../commerce/entities/commerce.entity';
import { Supplier } from '../../supplier/entities/supplier.entity';
import { SupplierProduct } from './supplier-product.entity';
import { PriceList } from './price-list.entity';

@Entity('price_change_events')
@Index('IDX_price_change_event_commerce_id', ['commerceId'])
@Index('IDX_price_change_event_supplier_product_id', ['supplierProductId'])
@Index('IDX_price_change_event_price_list_id', ['detectedInPriceListId'])
@Index('IDX_price_change_event_created_at', ['createdAt'])
export class PriceChangeEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'commerce_id', type: 'uuid' })
  commerceId!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @Column({ name: 'supplier_product_id', type: 'uuid' })
  supplierProductId!: string;

  @Column({ name: 'old_price', type: 'decimal', precision: 12, scale: 2 })
  oldPrice!: string;

  @Column({ name: 'new_price', type: 'decimal', precision: 12, scale: 2 })
  newPrice!: string;

  @Column({ name: 'change_percentage', type: 'decimal', precision: 8, scale: 2 })
  changePercentage!: string;

  @Column({ name: 'detected_in_price_list_id', type: 'uuid' })
  detectedInPriceListId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Commerce, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: Commerce;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  @ManyToOne(() => SupplierProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_product_id' })
  supplierProduct!: SupplierProduct;

  @ManyToOne(() => PriceList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'detected_in_price_list_id' })
  detectedInPriceList!: PriceList;
}
