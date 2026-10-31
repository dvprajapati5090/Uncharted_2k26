# Pull Request #142: Add Redis-backed BullMQ Queue for Notifications

## Summary of Changes
This pull request introduces Redis alongside BullMQ to manage asynchronous notification dispatch and email batching.

- Installs `bullmq` and `ioredis` packages
- Adds background worker loop in `src/workers/notification-worker.js`
- Connects to external Redis cluster
- Includes production release script

## Architectural Impact
- Replaces MongoDB change stream listener with Redis queue
