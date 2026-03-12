import { Queue, Worker } from 'bullmq';
import { config } from '../../config';

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  ...(config.redis.password ? { password: config.redis.password } : {}),
};

export const documentProcessingQueue = new Queue('document-processing', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400 },   // 24h
    removeOnFail: { age: 604800 },      // 7 days
  },
});

// Node only listens to events — Python is the actual processor
// autorun: false means the worker doesn't start automatically
export const documentProcessingWorker = new Worker(
  'document-processing',
  async () => {},
  { connection, autorun: false },
);
