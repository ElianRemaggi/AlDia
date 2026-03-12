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

export enum NotificationType {
  IMPORT_FINISHED = 'import_finished',
  PRICE_CHANGE = 'price_change',
  FAVORITE_PRICE_CHANGE = 'favorite_price_change',
}

@Entity('notifications')
@Index('IDX_notification_commerce_id', ['commerceId'])
@Index('IDX_notification_is_read', ['isRead'])
@Index('IDX_notification_created_at', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'commerce_id', type: 'uuid' })
  commerceId!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'metadata_json', type: 'jsonb', nullable: true })
  metadataJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Commerce, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commerce_id' })
  commerce!: Commerce;
}
