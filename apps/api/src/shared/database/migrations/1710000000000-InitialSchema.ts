import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Create user role enum
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM ('admin', 'commerce')`);

    // Create commerces table
    await queryRunner.query(`
      CREATE TABLE "commerces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "identifier" varchar(100),
        "email" varchar(255),
        "phone" varchar(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commerces" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_commerces_identifier" UNIQUE ("identifier")
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'commerce',
        "commerce_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "FK_users_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_users_commerce_id" ON "users" ("commerce_id")`);

    // Create suppliers table
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "supplier_code" varchar(100),
        "description" text,
        "contact_name" varchar(255),
        "contact_email" varchar(255),
        "contact_phone" varchar(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_suppliers_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_commerce_id" ON "suppliers" ("commerce_id")`,
    );

    // Unique index on (commerce_id, supplier_code) where supplier_code is not null
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_supplier_commerce_code"
        ON "suppliers" ("commerce_id", "supplier_code")
        WHERE "supplier_code" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "suppliers"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "commerces"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
