<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Seeder Guide

[Back to docs](./index.md)

## Table of Contents

- [Configuration](#configuration)
- [Creating Seeds](#creating-seeds)
- [Seeding Strategies](#seeding-strategies)
- [References](#references)
- [Examples](#examples)

## Configuration

Enable seeder in your `app.module.ts`:

```typescript
import { MongoModule } from '@core/mongo';
import { SqlModule } from '@core/sql';

@Module({
  imports: [
    // Enable seeding for both SQL and MongoDB
    MongoModule.root({ seeder: true }),
    SqlModule.root({ seeder: true }),
    // ...other imports
  ],
})
export class AppModule {}
```

## Creating Seeds

Create seed files in `src/seeds/sql` directory:

```typescript
import { Seed } from '@core/sql/seeder/seeder.dto';

const seed: Seed<YourEntity> = {
  model: 'ModelName',
  action: 'once',
  data: [
    {
      field1: 'value1',
      field2: 'value2',
    },
  ],
};

export default seed;
```

## Seeding Strategies

### One-Time Seeding

Only seeds if table is empty:

```typescript
const seed: Seed<Country> = {
  model: 'Country',
  action: 'once',
  data: [
    /* data */
  ],
};
```

### Always Seed with Update

Updates existing records or creates new ones:

```typescript
const seed: Seed<Template> = {
  model: 'Template',
  action: 'always',
  alwaysRule: 'update',
  alwaysWhere: (item) => ({ name: item.name }),
  data: [
    /* data */
  ],
};
```

### Other Strategies

- `never`: Skip seeding
- `always` with `delete`: Delete all records before seeding
- `always` with `truncate`: Delete all records before seeding using SQL truncate (Auto increment will reset)
- `always` with `create`: Only create if not exists

## References

Link records using `SeedReference`:

```typescript
import { SeedReference } from '@core/sql/seeder/seeder.dto';

const seed: Seed<YourEntity> = {
  model: 'Model',
  action: 'once',
  data: [
    {
      parent_id: new SeedReference({
        model: 'ParentModel',
        where: { field: 'value' },
        engine: 'sql', // or 'mongo'
      }),
    },
  ],
};
```

## Examples

### Basic Country Seed

```typescript
const seed: Seed<Country> = {
  model: 'Country',
  action: 'once',
  data: [
    {
      name: 'United States',
      code: 'US',
    },
  ],
};
```

### Template with Updates

```typescript
const seed: Seed<Template> = {
  model: 'Template',
  action: 'always',
  alwaysRule: 'update',
  alwaysWhere: (item) => ({ name: item.name }),
  data: [
    {
      name: 'forgot_password',
      title: 'Forgot Password',
      email_subject: 'Forgot Password',
      email_body: '<p>Hi ##TO_NAME##...</p>',
    },
  ],
};
```

### Environment Setup

Set `SEEDER_AWAIT` env to false to run seeder in background

```bash
SEEDER_AWAIT=Y  # Wait for seeder completion before app start
```
