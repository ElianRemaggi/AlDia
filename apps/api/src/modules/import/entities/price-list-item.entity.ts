import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PriceList } from './price-list.entity';
import { SupplierProduct } from './supplier-product.entity';

// Immutable — no UpdateDateColumn. Records are never updated after creation.
@Entity('price_list_items')
@Index('IDX_price_list_item_price_list_id', ['priceListId'])
@Index('IDX_price_list_item_supplier_product_id', ['supplierProductId'])
export class PriceListItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'price_list_id', type: 'uuid' })
  priceListId!: string;

  @Column({ name: 'supplier_product_id', type: 'uuid', nullable: true })
  supplierProductId!: string | null;

  @Column({ name: 'raw_name', type: 'varchar', length: 500, nullable: true })
  rawName!: string | null;

  @Column({ name: 'raw_description', type: 'text', nullable: true })
  rawDescription!: string | null;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2 })
  unitCost!: string;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'ARS' })
  currency!: string;

  @Column({ name: 'min_quantity', type: 'integer', nullable: true })
  minQuantity!: number | null;

  @Column({ name: 'bulk_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  bulkPrice!: string | null;

  @Column({ name: 'position_index', type: 'integer', nullable: true })
  positionIndex!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => PriceList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  priceList!: PriceList;

  @ManyToOne(() => SupplierProduct, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_product_id' })
  supplierProduct!: SupplierProduct | null;
}
