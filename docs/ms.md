<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Micro Service Setup

[Back to docs](./index.md)

## Overview

Microservice support in the framework provides patterns for handling distributed message queues and event-driven architectures.

## Client Setup

The MsClientService provides methods for executing jobs and handling responses:

```typescript
import { MsClientService } from '@core/modules/ms-client/ms-client.service';

@Injectable()
export class YourService {
  constructor(private msClient: MsClientService) {}

  async someMethod() {
    // Execute a job
    const response = await this.msClient.executeJob(
      'queue.name',
      new Job({
        action: 'methodName',
        payload: {
          // job data
        },
      }),
    );
  }
}
```

## Decorators

### @MsListener()

Use for handling message patterns (RPC-style requests):

```typescript
@Controller('notification')
export class NotificationController {
  @MsListener('controller.notification')
  async execute(job: Job): Promise<void> {
    const response = await this.service[job.action](job);
    await this.client.jobDone(job, response);
  }
}
```

### @MsEventListener()

Use for handling event patterns (pub/sub style):

```typescript
@Controller('blog')
export class BlogController {
  @MsEventListener('user:updated')
  async execute(job: Job): Promise<void> {
    const response = await this.blogService.$db.updateBulkRecords({
      owner: job.owner,
      options: {
        where: { user_id: job.payload.user_id },
      },
      body: {
        user_name: job.payload.user_name,
      },
    });
    await this.client.jobDoneMulti(job, response);
  }
}

@Controller('book')
export class BookController {
  @MsEventListener('user:updated')
  async execute(job: Job): Promise<void> {
    const response = await this.bookervice.$db.updateBulkRecords({
      owner: job.owner,
      options: {
        where: { user_id: job.payload.user_id },
      },
      body: {
        user_name: job.payload.user_name,
      },
    });
    await this.client.jobDoneMulti(job, response);
  }
}

@Injectable()
export class UserService extends ModelService<User> {
  constructor(
    db: SqlService<User>,
    private msClient: MsClientService,
  ) {
    super(db);
  }

  async doAfterUpdate(
    job: SqlJob<User>,
    response: SqlUpdateResponse<User>,
  ): Promise<void> {
    const { data, previousData } = response;
    if (data.name !== previousData.name) {
      await this.msClient.executeJob(
        'user:updated',
        new Job({
          payload: {
            user_id: response.data.id,
            user_name: response.data.name,
          },
        }),
      );
    }
  }
}
```

## Job Response Handling

### Single Response

For single-response jobs:

```typescript
await this.client.jobDone(job, {
  data: 'Success'
  // or
  error: 'Error message'
});
```

### Multiple Responses

For jobs that may trigger multiple responses:

```typescript
await this.client.jobDoneMulti(job, {
  data: 'Success',
  // Responses will be accumulated in job log
});
```

## Best Practices

1. Use meaningful queue names (e.g., 'user:updated', 'email:send')
2. Handle job errors appropriately
3. Use `jobDone` to update job status
4. Consider job logging for important operations
5. Keep job payloads small and focused

## Examples

### Email Notification System

```typescript
// Producer (Client)
await this.msClient.executeJob(
  'email.notification',
  new Job({
    action: 'send',
    payload: {
      template: 'welcome',
      to: 'user@example.com',
      variables: { name: 'John' },
    },
  }),
);

// Consumer (Listener)
@Controller('email')
export class EmailController {
  @MsListener('email.notification')
  async execute(job: Job): Promise<void> {
    const response = await this.emailService[job.action](job);
    await this.client.jobDone(job, response);
  }
}
```

### Event Broadcasting

```typescript
// Event Producer
await this.msClient.executeJob('user:updated',
  new Job({
    payload: {
      user_id: 123,
      changes: { name: 'New Name' }
    }
  })
);

// Event Consumer
@MsEventListener('user:updated')
async onUserUpdate(job: Job): Promise<void> {
  const response = await this.handleUserUpdate(job);
  await this.client.jobDoneMulti(job, response);
}
```

## Cross-Server Communication

Use `job.app` to send messages to different server instances:

```typescript
// Send message to socket server
await this.msClient.executeJob(
  'socket.event',
  new Job({
    app: 'socket-server', // Target server name
    action: 'broadcast',
    payload: {
      room: 'user-123',
      event: 'notification',
      data: { message: 'New update!' },
    },
  }),
);

// Send message to worker server
await this.msClient.executeJob(
  'process.task',
  new Job({
    app: 'worker', // Target server name
    action: 'process',
    payload: {
      taskId: 'task-123',
    },
  }),
);
```

### Server Identification

Common server identifiers:

- `api` - Main API server (default)
- `socket-server` - WebSocket server
- `worker` - Background job worker
- `scheduler` - Cron job scheduler

### Examples

#### Socket Notification

```typescript
// Send real-time notification
await this.msClient.executeJob(
  'socket.notification',
  new Job({
    app: 'socket-server',
    action: 'send',
    payload: {
      user_id: 123,
      message: 'Your profile was updated',
      data: { type: 'profile_update' },
    },
  }),
);
```

#### Background Processing

```typescript
// Trigger long-running task
await this.msClient.executeJob(
  'worker.process',
  new Job({
    app: 'worker',
    action: 'processReport',
    payload: {
      report_id: 456,
      type: 'monthly',
      format: 'pdf',
    },
  }),
);
```
