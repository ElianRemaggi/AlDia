import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Commerce } from '../../commerce/entities/commerce.entity';
import { PurchaseListItem } from './purchase-list-item.entity';

export enum PurchaseListStatus {
  ACTIVE = 'active',
  ORDERED = 'ordered',
  ARCHIVED = 'archived',
}

@Entity('purchase_lists')
@Index('IDX_purchase_list_commerce_id', ['commerceId'])
export class PurchaseList {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'commerce_id', type: 'uuid' })
  commerceId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: PurchaseListStatus, default: PurchaseListStatus.ACTIVE })
  status!: PurchaseListStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Commerce, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: Commerce;

  @OneToMany(() => PurchaseListItem, (item) => item.purchaseList)
  items!: PurchaseListItem[];
}
