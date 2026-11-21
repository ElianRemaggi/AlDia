import { MigrationInterface, QueryRunner } from 'typeorm';

/** Notify the commerce when an import fails (the pipeline is async; the bell is where they'll see it). */
export class ImportFailedNotification1710000000003 implements MigrationInterface {
  name = 'ImportFailedNotification1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'import_failed'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres can't drop an enum value: recreate the type without it.
    await queryRunner.query(`DELETE FROM "notifications" WHERE "type" = 'import_failed'`);
    await queryRunner.query(`ALTER TYPE "notification_type_enum" RENAME TO "notification_type_enum_old"`);
    await queryRunner.query(
      `CREATE TYPE "notification_type_enum" AS ENUM ('import_finished', 'price_change', 'favorite_price_change')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "notification_type_enum" USING "type"::text::"notification_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "notification_type_enum_old"`);
  }
}
