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

export enum ImportJobType {
  PARSE_DOCUMENT = 'parse_document',
  NORMALIZE = 'normalize',
  DETECT_CHANGES = 'detect_changes',
}

export enum ImportJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('import_jobs')
@Index('IDX_import_job_price_list_id', ['priceListId'])
@Index('IDX_import_job_status', ['status'])
export class ImportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'price_list_id', type: 'uuid' })
  priceListId!: string;

  @Column({
    name: 'job_type',
    type: 'enum',
    enum: ImportJobType,
    enumName: 'import_job_type_enum',
  })
  jobType!: ImportJobType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ImportJobStatus,
    enumName: 'import_job_status_enum',
    default: ImportJobStatus.QUEUED,
  })
  status!: ImportJobStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'meta_json', type: 'jsonb', nullable: true })
  metaJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => PriceList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  priceList!: PriceList;
}
