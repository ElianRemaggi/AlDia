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
import { PurchaseList } from './purchase-list.entity';
import { SupplierProduct } from '../../import/entities/supplier-product.entity';

@Entity('purchase_list_items')
@Index('IDX_pli_purchase_list_id', ['purchaseListId'])
export class PurchaseListItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_list_id', type: 'uuid' })
  purchaseListId!: string;

  @Column({ name: 'supplier_product_id', type: 'uuid' })
  supplierProductId!: string;

  @Column({ type: 'integer', default: 1 })
  quantity!: number;

  @Column({ name: 'unit_cost_snapshot', type: 'decimal', precision: 12, scale: 2 })
  unitCostSnapshot!: string;

  @Column({ type: 'varchar', length: 3, default: 'ARS' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => PurchaseList, (pl) => pl.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_list_id' })
  purchaseList!: PurchaseList;

  @ManyToOne(() => SupplierProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_product_id' })
  supplierProduct!: SupplierProduct;
}
