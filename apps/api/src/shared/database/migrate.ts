// Production migration runner: `node dist/shared/database/migrate.js`.
// Runs before the API starts in the container (see apps/api/Dockerfile); idempotent.
import 'reflect-metadata';
import { AppDataSource } from '../../config/data-source';

async function migrate() {
  await AppDataSource.initialize();
  const applied = await AppDataSource.runMigrations({ transaction: 'each' });
  console.log(
    applied.length > 0
      ? `Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ')}`
      : 'Database schema is up to date',
  );
  await AppDataSource.destroy();
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
