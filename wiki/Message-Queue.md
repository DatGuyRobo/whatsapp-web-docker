# Message Queue

Understanding and managing the Bull/Redis message queue.

## Overview

WhatsApp Web API v2.0 uses Bull (backed by Redis) for message queue management, enabling:
- Bulk message sending
- Automatic retries on failure
- Job prioritization
- Delayed message delivery
- Queue monitoring

## Architecture

```
┌─────────────┐
│   API       │
│  Request    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Bull     │
│   Queue     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Redis     │
│  Storage    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  WhatsApp   │
│   Sender    │
└─────────────┘
```

## Configuration

### Redis Connection

Configure in `.env`:

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Queue Options

Default queue configuration:

```javascript
const Queue = require('bull');

const messageQueue = new Queue('messages', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined
  },
  defaultJobOptions: {
    attempts: 3,                    // Retry 3 times
    backoff: {
      type: 'exponential',          // Exponential backoff
      delay: 2000                   // Starting at 2 seconds
    },
    removeOnComplete: 100,          // Keep last 100 completed jobs
    removeOnFail: 1000             // Keep last 1000 failed jobs
  }
});
```

## Using the Queue

### Add Jobs to Queue

**Single message**:
```javascript
const job = await messageQueue.add({
  number: '1234567890',
  message: 'Hello!'
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});

console.log('Job ID:', job.id);
```

**With priority**:
```javascript
// High priority (1 = highest)
await messageQueue.add(
  { number: '1234567890', message: 'Urgent!' },
  { priority: 1 }
);

// Normal priority
await messageQueue.add(
  { number: '1234567890', message: 'Normal' },
  { priority: 5 }
);

// Low priority
await messageQueue.add(
  { number: '1234567890', message: 'Later' },
  { priority: 10 }
);
```

**Delayed execution**:
```javascript
// Send after 1 hour
await messageQueue.add(
  { number: '1234567890', message: 'Reminder' },
  { delay: 3600000 }  // ms
);
```

**Bulk messages**:
```javascript
const messages = [
  { number: '1234567890', message: 'Hello 1', delay: 2000 },
  { number: '0987654321', message: 'Hello 2', delay: 2000 },
  { number: '1111111111', message: 'Hello 3', delay: 2000 }
];

const jobs = [];
for (const msg of messages) {
  const job = await messageQueue.add(msg, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  });
  jobs.push({ number: msg.number, jobId: job.id });
}

console.log(`${jobs.length} messages queued`);
```

### Process Jobs

```javascript
// Process one job at a time
messageQueue.process(async (job) => {
  const { number, message, delay } = job.data;
  
  // Optional delay
  if (delay) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Send message
  const result = await client.sendMessage(
    number.includes('@c.us') ? number : `${number}@c.us`,
    message
  );
  
  return result;
});

// Process multiple jobs concurrently (max 5)
messageQueue.process(5, async (job) => {
  // Process job
});
```

## Job Lifecycle

### Job States

```
pending → active → completed
                 ↘ failed → waiting (retry)
                          ↘ failed (final)
```

1. **Waiting**: Job is queued
2. **Active**: Job is being processed
3. **Completed**: Job finished successfully
4. **Failed**: Job failed (can retry)
5. **Delayed**: Job scheduled for later

### Job Events

```javascript
// Job completed
messageQueue.on('completed', (job, result) => {
  logger.info(`Message sent: ${job.id}`, result);
});

// Job failed
messageQueue.on('failed', (job, error) => {
  logger.error(`Message failed: ${job.id}`, error);
});

// Job stalled
messageQueue.on('stalled', (job) => {
  logger.warn(`Job stalled: ${job.id}`);
});

// Job progress
messageQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id}: ${progress}%`);
});

// Queue errors
messageQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});
```

## Monitoring

### Queue Statistics

```javascript
async function getQueueStats() {
  const counts = await messageQueue.getJobCounts();
  
  return {
    waiting: counts.waiting,
    active: counts.active,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
    paused: counts.paused
  };
}

// Example output:
// {
//   waiting: 50,
//   active: 5,
//   completed: 1000,
//   failed: 10,
//   delayed: 20,
//   paused: 0
// }
```

### Get Jobs

```javascript
// Get waiting jobs
const waiting = await messageQueue.getWaiting();

// Get active jobs
const active = await messageQueue.getActive();

// Get completed jobs
const completed = await messageQueue.getCompleted(0, 10);  // First 10

// Get failed jobs
const failed = await messageQueue.getFailed(0, 10);

// Get delayed jobs
const delayed = await messageQueue.getDelayed();
```

### Job Details

```javascript
// Get specific job
const job = await messageQueue.getJob(jobId);

if (job) {
  console.log('State:', await job.getState());
  console.log('Data:', job.data);
  console.log('Progress:', job.progress);
  console.log('Attempts:', job.attemptsMade);
  console.log('Created:', job.timestamp);
  console.log('Processed:', job.processedOn);
  console.log('Finished:', job.finishedOn);
  console.log('Failed reason:', job.failedReason);
}
```

## Queue Management

### Pause/Resume Queue

```javascript
// Pause queue (jobs won't be processed)
await messageQueue.pause();

// Resume queue
await messageQueue.resume();

// Check if paused
const isPaused = await messageQueue.isPaused();
```

### Clean Old Jobs

```javascript
// Clean completed jobs older than 1 day
await messageQueue.clean(86400000, 'completed');

// Clean failed jobs older than 7 days
await messageQueue.clean(604800000, 'failed');

// Clean all completed jobs
await messageQueue.clean(0, 'completed');

// Clean by status
await messageQueue.clean(3600000, 'completed');  // 1 hour
await messageQueue.clean(3600000, 'failed');
await messageQueue.clean(3600000, 'delayed');
```

### Empty Queue

```javascript
// Remove all waiting jobs
await messageQueue.empty();

// This doesn't affect:
// - Active jobs (currently processing)
// - Delayed jobs
// - Completed/failed jobs
```

### Drain Queue

```javascript
// Wait for all jobs to complete
await messageQueue.whenCurrentJobsFinished();

// Then empty
await messageQueue.empty();
```

### Close Queue

```javascript
// Graceful shutdown
await messageQueue.close();
```

## Advanced Features

### Job Progress

```javascript
messageQueue.process(async (job) => {
  const { number, message } = job.data;
  
  // Update progress
  await job.progress(25);
  
  // Send message
  await client.sendMessage(number, message);
  
  await job.progress(50);
  
  // Wait for delivery
  await waitForDelivery(number);
  
  await job.progress(100);
  
  return { success: true };
});
```

### Job Dependencies

```javascript
// Job B depends on Job A
const jobA = await messageQueue.add({ type: 'A' });

const jobB = await messageQueue.add(
  { type: 'B' },
  { jobId: `job-b-${jobA.id}` }
);

// In processor, check dependency
messageQueue.process(async (job) => {
  if (job.data.type === 'B') {
    const parentJob = await messageQueue.getJob(/* parent ID */);
    if (parentJob && await parentJob.isCompleted()) {
      // Process job B
    }
  }
});
```

### Rate Limiting

```javascript
// Limit processing rate
const limiter = {
  max: 10,       // 10 jobs
  duration: 1000 // per second
};

const messageQueue = new Queue('messages', {
  redis: { host: 'redis', port: 6379 },
  limiter
});
```

### Repeatable Jobs

```javascript
// Send message every hour
await messageQueue.add(
  { number: '1234567890', message: 'Hourly reminder' },
  {
    repeat: {
      cron: '0 * * * *'  // Every hour at :00
    }
  }
);

// Get repeatable jobs
const repeatableJobs = await messageQueue.getRepeatableJobs();

// Remove repeatable job
await messageQueue.removeRepeatable(
  'job-name',
  { cron: '0 * * * *' }
);
```

## Redis CLI Commands

### Check Queue Status

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List all keys
KEYS bull:messages:*

# Get waiting jobs count
LLEN bull:messages:wait

# Get active jobs count
LLEN bull:messages:active

# Get completed jobs count
ZCARD bull:messages:completed

# Get failed jobs count
ZCARD bull:messages:failed
```

### View Job Data

```bash
# Get waiting jobs
LRANGE bull:messages:wait 0 -1

# Get job details
HGETALL bull:messages:{jobId}

# Get job data
HGET bull:messages:{jobId} data
```

### Clear Queue

```bash
# Delete all queue keys (CAREFUL!)
KEYS bull:messages:* | xargs DEL

# Or flush entire database (VERY CAREFUL!)
FLUSHDB
```

## Troubleshooting

### Jobs Not Processing

**Check processor is running**:
```javascript
// Ensure process() is called
messageQueue.process(async (job) => {
  // Job processing logic
});
```

**Check Redis connection**:
```bash
docker-compose logs redis
docker-compose exec redis redis-cli PING
```

**Check for stalled jobs**:
```javascript
const stalled = await messageQueue.getActive();
console.log('Stalled jobs:', stalled.length);

// Clean stalled jobs
await messageQueue.clean(0, 'active');
```

### High Memory Usage

**Clean old jobs regularly**:
```javascript
// Run cleanup daily
setInterval(async () => {
  await messageQueue.clean(86400000, 'completed');
  await messageQueue.clean(604800000, 'failed');
}, 86400000);
```

**Reduce job retention**:
```javascript
const messageQueue = new Queue('messages', {
  defaultJobOptions: {
    removeOnComplete: 10,   // Keep only 10 completed
    removeOnFail: 50        // Keep only 50 failed
  }
});
```

### Jobs Failing

**Check error logs**:
```javascript
const failed = await messageQueue.getFailed(0, 10);
failed.forEach(job => {
  console.log('Job:', job.id);
  console.log('Failed reason:', job.failedReason);
  console.log('Stack trace:', job.stacktrace);
});
```

**Retry failed jobs**:
```javascript
const failed = await messageQueue.getFailed();
for (const job of failed) {
  await job.retry();
}
```

## Best Practices

1. **Set appropriate retry attempts** (3-5)
2. **Use exponential backoff** for retries
3. **Clean old jobs** regularly
4. **Monitor queue depth** to prevent buildup
5. **Set job timeouts** to prevent stuck jobs
6. **Use priorities** for important messages
7. **Implement error handling** in processors
8. **Log job lifecycle** events
9. **Monitor Redis memory** usage
10. **Test queue behavior** under load

---

[← Back to Migration Guide](Migration-Guide.md) | [Home](Home.md)
