import { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogAndCommerce1710000000002 implements MigrationInterface {
  name = 'CatalogAndCommerce1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------------------
    // Enums
    // ---------------------------------------------------------------------------
    await queryRunner.query(
      `CREATE TYPE "markup_scope_type_enum" AS ENUM ('supplier_product', 'commerce_product', 'supplier')`,
    );

    await queryRunner.query(
      `CREATE TYPE "purchase_list_status_enum" AS ENUM ('active', 'ordered', 'archived')`,
    );

    await queryRunner.query(
      `CREATE TYPE "notification_type_enum" AS ENUM ('import_finished', 'price_change', 'favorite_price_change')`,
    );

    // ---------------------------------------------------------------------------
    // commerce_products
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "commerce_products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "name" varchar(500) NOT NULL,
        "internal_code" varchar(100),
        "description" text,
        "category" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commerce_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_commerce_products_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_commerce_product_commerce_id" ON "commerce_products" ("commerce_id")`,
    );

    // ---------------------------------------------------------------------------
    // commerce_product_supplier_links
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "commerce_product_supplier_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "commerce_product_id" uuid,
        "supplier_product_id" uuid NOT NULL,
        "is_favorite" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_commerce_product_supplier_links" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cpsl_commerce_supplier_product" UNIQUE ("commerce_id", "supplier_product_id"),
        CONSTRAINT "FK_cpsl_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cpsl_commerce_product" FOREIGN KEY ("commerce_product_id")
          REFERENCES "commerce_products"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_cpsl_supplier_product" FOREIGN KEY ("supplier_product_id")
          REFERENCES "supplier_products"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_cpsl_commerce_id" ON "commerce_product_supplier_links" ("commerce_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_cpsl_supplier_product_id" ON "commerce_product_supplier_links" ("supplier_product_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_cpsl_is_favorite" ON "commerce_product_supplier_links" ("is_favorite")`,
    );

    // ---------------------------------------------------------------------------
    // markup_rules
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "markup_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "scope_type" "markup_scope_type_enum" NOT NULL,
        "supplier_id" uuid,
        "supplier_product_id" uuid,
        "commerce_product_id" uuid,
        "markup_percentage" numeric(8,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_markup_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_markup_rules_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_markup_rules_supplier" FOREIGN KEY ("supplier_id")
          REFERENCES "suppliers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_markup_rules_supplier_product" FOREIGN KEY ("supplier_product_id")
          REFERENCES "supplier_products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_markup_rules_commerce_product" FOREIGN KEY ("commerce_product_id")
          REFERENCES "commerce_products"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_markup_rules_commerce_id" ON "markup_rules" ("commerce_id")`,
    );

    // ---------------------------------------------------------------------------
    // purchase_lists
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "purchase_lists" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "status" "purchase_list_status_enum" NOT NULL DEFAULT 'active',
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_lists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_lists_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_list_commerce_id" ON "purchase_lists" ("commerce_id")`,
    );

    // ---------------------------------------------------------------------------
    // purchase_list_items
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "purchase_list_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "purchase_list_id" uuid NOT NULL,
        "supplier_product_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "unit_cost_snapshot" numeric(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'ARS',
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_list_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pli_purchase_list" FOREIGN KEY ("purchase_list_id")
          REFERENCES "purchase_lists"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pli_supplier_product" FOREIGN KEY ("supplier_product_id")
          REFERENCES "supplier_products"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_pli_purchase_list_id" ON "purchase_list_items" ("purchase_list_id")`,
    );

    // ---------------------------------------------------------------------------
    // notifications
    // ---------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "commerce_id" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "metadata_json" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_commerce" FOREIGN KEY ("commerce_id")
          REFERENCES "commerces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_notification_commerce_id" ON "notifications" ("commerce_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_notification_is_read" ON "notifications" ("is_read")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_notification_created_at" ON "notifications" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "purchase_list_items"`);
    await queryRunner.query(`DROP TABLE "purchase_lists"`);
    await queryRunner.query(`DROP TABLE "markup_rules"`);
    await queryRunner.query(`DROP TABLE "commerce_product_supplier_links"`);
    await queryRunner.query(`DROP TABLE "commerce_products"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE "purchase_list_status_enum"`);
    await queryRunner.query(`DROP TYPE "markup_scope_type_enum"`);
  }
}
