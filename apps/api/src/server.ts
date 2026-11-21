import 'reflect-metadata';
import { AppDataSource } from './config/data-source';
import { config } from './config';
import app from './app';
import { startImportEvents } from './modules/import/import.events';

async function bootstrap() {
  if (config.nodeEnv === 'production' && (process.env.JWT_SECRET ?? '').length < 32) {
    console.error('JWT_SECRET must be set to a random string of at least 32 characters in production');
    process.exit(1);
  }

  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Listen for document-processing results only once the DB is ready.
    startImportEvents();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
