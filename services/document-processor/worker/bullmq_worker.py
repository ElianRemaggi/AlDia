import asyncio
import os
from bullmq import Worker
from worker.job_handler import handle_job


async def start_worker():
    connection = {
        'host': os.getenv('REDIS_HOST', 'localhost'),
        'port': int(os.getenv('REDIS_PORT', 6379)),
    }
    password = os.getenv('REDIS_PASSWORD')
    if password:
        connection['password'] = password

    worker = Worker(
        'document-processing',
        handle_job,
        {'connection': connection},
    )
    # Python bullmq starts consuming on construction (autorun); there is no waitUntilReady().
    print('Document processor worker started. Listening on document-processing queue...')
    try:
        while True:
            await asyncio.sleep(1)
    except (KeyboardInterrupt, asyncio.CancelledError):
        print('Worker shutting down...')
        await worker.close()


if __name__ == '__main__':
    asyncio.run(start_worker())
