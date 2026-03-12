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

@Entity('import_parse_results')
@Index('IDX_import_parse_result_price_list_id', ['priceListId'])
export class ImportParseResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'price_list_id', type: 'uuid' })
  priceListId!: string;

  @Column({ name: 'parser_name', type: 'varchar', length: 100 })
  parserName!: string;

  @Column({ name: 'parser_version', type: 'varchar', length: 20 })
  parserVersion!: string;

  @Column({ name: 'raw_output_json', type: 'jsonb' })
  rawOutputJson!: Record<string, unknown>;

  @Column({ name: 'normalized_output_json', type: 'jsonb', nullable: true })
  normalizedOutputJson!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => PriceList, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  priceList!: PriceList;
}
