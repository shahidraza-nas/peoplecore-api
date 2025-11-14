# PeopleCore API - AI Agent Instructions

## Architecture Overview

This is a **NestJS-based framework** built on top of the [nest-core-v2](https://github.com/NewAgeSMBDevelopers/nest-core-v2) framework, designed for rapid API development with dual database support (SQL/MongoDB). Generated using `@newagesmb/api-cli`.

### Core Principles

- **Database-agnostic modules**: Separate `/modules/sql/` and `/modules/mongo/` directories for database-specific implementations
- **Shared libraries**: Core functionality in `/libs/` (email, firebase, geocoder, twilio, sql, mongo)
- **Job-based architecture**: All service operations use a `Job` pattern with `{ owner, action, payload, body }` structure
- **Decorator-driven**: Extensive custom decorators for auth, file uploads, responses, versioning

## Project Structure

```
libs/              # Reusable modules (@core/sql, @core/email, @core/firebase, etc.)
src/
  core/           # Framework utilities, decorators, guards, interceptors
  modules/        # Feature modules (split by database: sql/ and mongo/)
  config/         # App configuration (jwt, redis, swagger, microservices)
  seeds/          # Database seeders (sql/ and mongo/)
docs/             # Framework documentation
```

## Key Development Patterns

### 1. Module Generation

Use CLI to generate CRUD resources:

```bash
nac module user-profile           # Interactive mode
nac module order --useSql        # Force SQL
nac module product --useMongo    # Force MongoDB
```

Generated modules follow this structure:
- `entities/` - Database models
- `dto/` - DTOs extend model with `OmitType`, `PickType`, `PartialType`
- `{name}.controller.ts` - Standard CRUD endpoints
- `{name}.service.ts` - Extends `ModelService<T>`
- `{name}.module.ts` - Feature module with database provider

### 2. Service Layer Pattern

**Always extend `ModelService<T>`** and override lifecycle hooks:

```typescript
import { ModelService, SqlService, SearchFields } from '@core/sql';

export class UserService extends ModelService<User> {
  // Define searchable fields (supports scoped search)
  searchFields: SearchFields<User> = ['name', 'email', 'phone'];
  
  // Lifecycle hooks
  async doBeforeCreate(job: SqlJob<User>): Promise<void> { }
  async doAfterCreate(job: SqlJob<User>, response: SqlCreateResponse<User>): Promise<void> { }
  async doBeforeUpdate(job: SqlJob<User>): Promise<void> { }
  async doAfterUpdate(job: SqlJob<User>, response: SqlUpdateResponse<User>): Promise<void> { }
}
```

### 3. Controller Pattern

Standard CRUD controller structure:

```typescript
@ApiTags('user')
@ApiBearerAuth()
@ApiErrorResponses()
@ApiExtraModels(User)
@Controller('user')
export class UserController {
  // Use @Owner() to get authenticated user
  // Use framework response decorators: ResponseGetAll, ResponseCreated, etc.
  // Return responses using: Result(), Created(), NotFound(), BadRequest(), ErrorResponse()
  
  @Get()
  @ResponseGetAll(User)
  async findAll(@Owner() owner: OwnerDto, @Query() query: any) {
    const { error, data, offset, limit, count } = await this.service.findAll({
      owner, action: 'findAll', payload: { ...query }
    });
    return Result(res, { data: { users: data, offset, limit, count } });
  }
}
```

### 4. Query Parameters (CRUD Operations)

Framework supports advanced query parameters (see `docs/crud.md`):

- `offset` / `limit` - Pagination
- `search` - Full-text search: `"text"` or `["scope", "text"]`
- `select` - Field selection: `["id", "name", "table.field"]`
- `where` - Filtering: `{ "field": "value", "field2": { "$gte": 5 } }`
- `populate` - Relations: `["relation", "relation*"]` (* = required), prefix `+` for soft deleted, `-` for separate query
- `sort` - Ordering: `["field"]` or `[["field", "desc"]]`
- `scope` (SQL only) - Predefined scopes: `["active", ["status", "pending"]]`

### 5. Custom Decorators (see `docs/controller.md`)

**Auth & Authorization:**
- `@Public()` - Skip authentication
- `@Roles(Role.Admin, Role.Manager)` - Role-based access
- `@Owner()` - Get authenticated user object
- `@OwnerIncludeAttribute('password')` - Include hidden fields
- `@OwnerIncludePopulate('roles')` - Preload relations

**Utilities:**
- `@GetIP()` - Extract client IP
- `@IncludeSettings('key1', 'key2')` - Load settings
- `@Settings()` / `@SettingValue('key')` - Access settings

**File Uploads:**
```typescript
@FileUploads([
  { name: 'avatar_file', required: false, bodyField: 'avatar', cdn: 'local' }
])
```

**API Versioning:**
- `@ForVersion(2)` - Specific version only
- `@FromVersion(2)` - Version 2 and above
- `@TillVersion(2)` - Up to version 2
- `@BetweenVersions(1, 3)` - Version range

### 6. Entity Patterns

**SQL Entities** (Sequelize TypeScript):

```typescript
import { SqlModel } from '@core/sql/sql.model';
import { IsUnique } from '@core/sql/sql.unique-validator';

@Table
export class User extends SqlModel {
  @Column({ unique: true })
  @IsUnique('User', { message: 'Email already exists' })
  @IsEmail()
  email: string;
  
  // Lifecycle hooks
  @BeforeCreate
  static async hashPassword(instance: User) { }
  
  @BeforeSave
  static setName(instance: User) { }
  
  // Hide sensitive fields
  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}
```

**MongoDB Entities** (Mongoose):
- Extend from `MongoSchema`
- Use `@MongoosePlugin()` decorators
- Similar lifecycle hooks available

### 7. Database Seeders

Create in `src/seeds/sql/` or `src/seeds/mongo/`:

```typescript
import { Seed, SeedReference } from '@core/sql/seeder/seeder.dto';

const seed: Seed<User> = {
  model: 'User',
  action: 'once',  // 'once' | 'never' | 'always'
  alwaysRule: 'update',  // 'update' | 'delete' | 'truncate' | 'create'
  alwaysWhere: (item) => ({ email: item.email }),
  data: [
    {
      name: 'Admin',
      parent_id: new SeedReference({
        model: 'ParentModel',
        where: { field: 'value' },
        engine: 'sql'
      })
    }
  ]
};
export default seed;
```

Enable in `app.module.ts`: `SqlModule.root({ seeder: true })`

### 8. Microservices Pattern

Use `MsClientService` for inter-service communication:

```typescript
// Producer
await this.msClient.executeJob('user:updated', new Job({
  app: 'socket-server',  // Target server (optional)
  action: 'broadcast',
  payload: { user_id: 123 }
}));

// Consumer
@MsListener('controller.notification')  // RPC-style
@MsEventListener('user:updated')        // Pub/sub style
async execute(job: Job): Promise<void> {
  const response = await this.service[job.action](job);
  await this.client.jobDone(job, response);  // Single response
  // OR
  await this.client.jobDoneMulti(job, response);  // Multi response
}
```

## Development Workflow

### Commands

```bash
npm run start              # Dev with watch mode
npm run start:swc          # Dev with SWC (faster)
npm run build              # Production build
npm run prod               # Build + PM2 cluster deploy

npm run test               # Unit tests
npm run test:e2e           # E2E tests (all)
npm run test:e2e:sql       # SQL-specific E2E
npm run test:e2e:mongo     # MongoDB-specific E2E

nac add firebase           # Add library packages
nac module user-profile    # Generate CRUD module
```

### Environment Configuration

Copy `.env.example` to `.env`. Key variables:

```bash
DATABASE_HOST/PORT/USERNAME/PASSWORD/NAME  # SQL config
DATABASE_ALTER_SYNC=Y                      # Auto-sync schema (dev only)
DATABASE_LOGGING=Y                         # Log SQL queries
MONGO_URI=mongodb://localhost/db_name      # MongoDB
SEEDER_AWAIT=Y                            # Wait for seeds on startup
```

Production: Use `AWS_ENV_SECRET_ID` for AWS Secrets Manager integration.

## Testing Patterns

- Controllers: Use `supertest` for E2E testing
- Services: Mock `SqlService<T>` / `MongoService<T>`
- Test files mirror source structure: `{name}.spec.ts` / `{name}.e2e-spec.ts`

## Important Conventions

1. **Never bypass the Job pattern** - All service methods accept `{ owner, action, body, payload }`
2. **Use framework responses** - `Result()`, `Created()`, `NotFound()`, `BadRequest()`, `ErrorResponse()`
3. **DTOs inherit from entities** - Use `OmitType()`, `PickType()`, `PartialType()`
4. **Response wrappers** - Use `ResponseGetAll()`, `ResponseCreated()`, etc. for Swagger docs
5. **Error handling** - Check for `NotFoundError` and `ValidationError` from `@core/errors`
6. **Database isolation** - SQL modules never import MongoDB modules and vice versa

## Real-World Examples (Naiija-API)

### Chat/Messaging Architecture
The project follows a **Matches-Messages** pattern (similar to dating apps):
- `Chat` (Match) entity represents a conversation between two users
- `ChatMessage` (Message) entity stores individual messages within a chat
- Supports real-time messaging via microservices and WebSocket integration

**Entity Patterns:**
```typescript
// Chat entity with user relations
@Table
export class Chat extends SqlModel {
  @Column({ unique: 'uid' })
  @Index('chat_uid')
  uid: string;
  
  @ForeignKey(() => User)
  @Column({ allowNull: false })
  user1Id: number;
  
  @ForeignKey(() => User)
  @Column({ allowNull: false })
  user2Id: number;
  
  @BelongsTo(() => User, 'user1Id')
  user1: User;
  
  @BelongsTo(() => User, 'user2Id')
  user2: User;
  
  @HasMany(() => ChatMessage)
  messages: ChatMessage[];
  
  @BeforeCreate
  static setUuid(instance: Chat) {
    instance.uid = `chat_${uuid()}`;
  }
}
```

**Microservice Integration:**
```typescript
// Controller with MS listener
@Controller('chat-message')
export class ChatMessageController {
  @MsListener('app.message')
  async execute(job: Job): Promise<void> {
    const response = await this.service[job.action](job);
    await this.client.jobDone(job, response);
  }
}

// Service sending messages via MS
async sendMessage(job: Job) {
  // Save message
  const { data } = await this.create({...});
  
  // Emit via socket
  await this.msClient.executeJob('socket.event', new Job({
    app: 'socket-server',
    action: 'sendMessage',
    payload: { ...data }
  }));
}
```

**Key Patterns from Naiija:**
1. Use `uid` (unique string) alongside `id` for public-facing identifiers
2. `@Index` decorator for frequently queried fields
3. `isRead` boolean flag for message tracking
4. `MessageType` enum (`USER`, `SYSTEM`) for different message types
5. Complex `include` chains for populating user photos in chat lists
6. Separate query DTOs for different operations (`GetChatsQueryDto`, `GetMessagesQueryDto`)

## Documentation

Comprehensive docs in `/docs/`:
- `crud.md` - Query parameters and filtering
- `controller.md` - Custom decorators
- `sql.md` / `mongo.md` - Database setup
- `seeder.md` - Database seeding
- `upload.md` - File upload patterns
- `ms.md` - Microservices
- `auth.md` - Authentication strategies
