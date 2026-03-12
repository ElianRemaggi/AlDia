import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImportPipeline1710000000001 implements MigrationInterface {
  name = 'ImportPipeline1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------------------
    // Enums
    // ---------------------------------------------------------------------------
    await queryRunner.query(
      `CREATE TYPE "price_list_source_type_enum" AS ENUM ('pdf', 'csv', 'excel', 'manual', 'image')`,
    );

    await queryRunner.query(
      `CREATE TYPE "price_list_status_enum" AS ENUM ('pending', 'processing', 'processed', 'failed', 'partially_processed')`,
    );

    await queryRunner.query(
      `CREATE TYPE "import_job_type_enum" AS ENUM ('parse_document', 'normalize', 'detect_changes')`,
    );

    await queryRunner.query(
      `CREATE TYPE "import_job_status_enum" AS ENUM ('queued', 'running', 'completed', 'failed')`,
    );

    // ---------------------------------------------------------------------------
    // supplier_products
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "supplier_products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "supplier_product_code" varchar(100),
        "name" varchar(500) NOT NULL,
        "description" text,
        "unit" varchar(50),
        "brand" varchar(255),
        "category" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_supplier_products_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supplier_products_supplier" FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_product_commerce_id" ON "supplier_products" ("commerce_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_product_supplier_id" ON "supplier_products" ("supplier_id")`,
    );

    // Conditional unique: a supplier may not have two products with the same code,
    // but NULL codes are allowed to repeat.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_supplier_product_supplier_code"
        ON "supplier_products" ("supplier_id", "supplier_product_code")
        WHERE "supplier_product_code" IS NOT NULL
    `);

    // ---------------------------------------------------------------------------
    // price_lists
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "price_lists" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "source_type" "price_list_source_type_enum" NOT NULL,
        "source_file_url" text,
        "source_file_name" varchar(500),
        "uploaded_by_user_id" uuid NOT NULL,
        "status" "price_list_status_enum" NOT NULL DEFAULT 'pending',
        "version_number" integer NOT NULL,
        "effective_date" date,
        "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_lists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_price_lists_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_price_lists_supplier" FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_price_lists_user" FOREIGN KEY ("uploaded_by_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_price_list_commerce_id" ON "price_lists" ("commerce_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_price_list_supplier_id" ON "price_lists" ("supplier_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_price_list_status" ON "price_lists" ("status")`,
    );

    // Supports efficient price history queries ordered by upload time
    await queryRunner.query(
      `CREATE INDEX "IDX_price_list_supplier_uploaded_at" ON "price_lists" ("supplier_id", "uploaded_at" DESC)`,
    );

    // Each supplier gets a monotonically increasing version per commerce
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_price_list_supplier_version"
        ON "price_lists" ("supplier_id", "version_number")
    `);

    // ---------------------------------------------------------------------------
    // price_list_items  (immutable — no updated_at)
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "price_list_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "price_list_id" uuid NOT NULL,
        "supplier_product_id" uuid,
        "raw_name" varchar(500),
        "raw_description" text,
        "unit_cost" numeric(12, 2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'ARS',
        "min_quantity" integer,
        "bulk_price" numeric(12, 2),
        "position_index" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_list_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_price_list_items_price_list" FOREIGN KEY ("price_list_id")
          REFERENCES "price_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_price_list_items_supplier_product" FOREIGN KEY ("supplier_product_id")
          REFERENCES "supplier_products"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_price_list_item_price_list_id" ON "price_list_items" ("price_list_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_price_list_item_supplier_product_id" ON "price_list_items" ("supplier_product_id")`,
    );

    // ---------------------------------------------------------------------------
    // price_change_events  (append-only — no updated_at)
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "price_change_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "supplier_product_id" uuid NOT NULL,
        "old_price" numeric(12, 2) NOT NULL,
        "new_price" numeric(12, 2) NOT NULL,
        "change_percentage" numeric(8, 2) NOT NULL,
        "detected_in_price_list_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_change_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_price_change_events_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_price_change_events_supplier" FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_price_change_events_supplier_product" FOREIGN KEY ("supplier_product_id")
          REFERENCES "supplier_products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_price_change_events_price_list" FOREIGN KEY ("detected_in_price_list_id")
          REFERENCES "price_lists"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_price_change_event_commerce_id" ON "price_change_events" ("commerce_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_price_change_event_supplier_product_id" ON "price_change_events" ("supplier_product_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_price_change_event_price_list_id" ON "price_change_events" ("detected_in_price_list_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_price_change_event_created_at" ON "price_change_events" ("created_at")`,
    );

    // ---------------------------------------------------------------------------
    // import_jobs
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "import_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "price_list_id" uuid NOT NULL,
        "job_type" "import_job_type_enum" NOT NULL,
        "status" "import_job_status_enum" NOT NULL DEFAULT 'queued',
        "started_at" TIMESTAMP WITH TIME ZONE,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        "error_message" text,
        "meta_json" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_import_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_import_jobs_price_list" FOREIGN KEY ("price_list_id")
          REFERENCES "price_lists"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_import_job_price_list_id" ON "import_jobs" ("price_list_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_import_job_status" ON "import_jobs" ("status")`,
    );

    // ---------------------------------------------------------------------------
    // import_parse_results
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "import_parse_results" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "price_list_id" uuid NOT NULL,
        "parser_name" varchar(100) NOT NULL,
        "parser_version" varchar(20) NOT NULL,
        "raw_output_json" jsonb NOT NULL,
        "normalized_output_json" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_import_parse_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_import_parse_results_price_list" FOREIGN KEY ("price_list_id")
          REFERENCES "price_lists"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_import_parse_result_price_list_id" ON "import_parse_results" ("price_list_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE "import_parse_results"`);
    await queryRunner.query(`DROP TABLE "import_jobs"`);
    await queryRunner.query(`DROP TABLE "price_change_events"`);
    await queryRunner.query(`DROP TABLE "price_list_items"`);
    await queryRunner.query(`DROP TABLE "price_lists"`);
    await queryRunner.query(`DROP TABLE "supplier_products"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "import_job_status_enum"`);
    await queryRunner.query(`DROP TYPE "import_job_type_enum"`);
    await queryRunner.query(`DROP TYPE "price_list_status_enum"`);
    await queryRunner.query(`DROP TYPE "price_list_source_type_enum"`);
  }
}
