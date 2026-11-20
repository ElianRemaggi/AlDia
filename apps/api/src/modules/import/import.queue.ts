import { Queue, QueueEvents } from 'bullmq';
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

// Python is the only consumer of this queue. Node never processes jobs: it
// listens to queue-wide events (QueueEvents sees jobs finished by any worker;
// a Worker's own events only cover jobs that Worker processed itself).
export const documentProcessingEvents = new QueueEvents('document-processing', {
  connection,
  autorun: false,
});
