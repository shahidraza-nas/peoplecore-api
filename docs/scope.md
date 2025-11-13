<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Setting Up Scopes

[Back to docs](./index.md)

Scopes in SQL models allow you to define commonly-used queries that you can reference later. This guide explains how to set up and use scopes in your models.

## Basic Setup

To add scopes to your model, use the `@Scopes` decorator from `sequelize-typescript`:

```typescript
import { Scopes } from 'sequelize-typescript';

@Scopes(() => ({
  // scope definitions here
}))
@Table
export class YourModel extends SqlModel {
  // model definition
}
```

## Scope Types

### Simple Scopes

Simple scopes apply basic filtering conditions:

```typescript
@Scopes(() => ({
  active: {
    where: { status: 'active' }
  }
}))
```

### Parameterized Scopes

Scopes that accept parameters for dynamic queries:

```typescript
@Scopes(() => ({
  active: {
    where: { status: 'active' }
  },
  statusType: (status: string) => ({
    where: { status }
  })
}))
```

## Real-World Examples

Here are some examples from the Inventory model:

### Geographic Scope

This scope finds records within a specified distance from coordinates (PostgreSQL):

```typescript
purchasedWithin: (lng: number, lat: number, distance = 1000) => ({
  where: {
    purchased_latlng: where(
      fn(
        'ST_DWithin',
        col('purchased_latlng'),
        cast(fn('ST_SetSRID', fn('ST_MakePoint', lng, lat), 4326), 'geography'),
        distance,
      ),
      true,
    ),
  },
});
```

### Complex Filter Scope

This scope excludes records based on related table conditions:

```typescript
notLiked: (user_id: number) => ({
  where: {
    id: {
      [Op.notIn]: literal(
        `(SELECT "blog_id" FROM "likes" WHERE "user_id" = ${user_id})`,
      ),
    },
    active: true,
  },
});
```

### Access Job object in scope

The Job object (`SqlJob<T>`) can be accessed as the last parameter in your scope definition. This allows you to incorporate user context and job-specific data into your queries.

```typescript
@Scopes(() => ({
  statusType: (status: string, job: SqlJob<YourModel>) => ({
    where: { status, user_id: job.owner.id }
  })
}))
```

## Using Scopes

You can use scopes in your queries:

```typescript
// Simple scope
await this.userService.$db.getAllRecords({
  options: {
    scope: ['active'],
  },
});

// Parameterized scope
await this.userService.$db.getAllRecords({
  options: {
    scope: [['purchasedWithin', 40.7128, -74.006, 5000]],
  },
});

// Multiple scopes
await this.userService.$db.getAllRecords({
  options: {
    scope: ['active', ['statusType', 'pending']],
  },
});

// Ignore all scopes, including default scopes
await this.userService.$db.getAllRecords({
  options: {
    unscoped: true,
  },
});
```

## Input Validation

It's recommended to validate scope parameters to prevent errors:

```typescript
statusType: (status_id: number) => {
  if (!Number.isInteger(status_id)) {
    throw new BadRequestException([
      {
        value: status_id,
        property: 'status_id',
        children: [],
        constraints: {
          isInt: 'status_id must be a valid integer',
        },
      },
    ]);
  }
  return {
    where: { status_id },
  };
};
```

## Best Practices

1. Always validate input parameters
2. Use TypeScript types for better code safety
3. Document scope parameters and their expected values
4. Consider adding error handling for invalid inputs
5. Use meaningful scope names that describe their purpose

## References

- <a target="_blank" href="https://sequelize.org/docs/v6/other-topics/scopes/">Sequelize Scopes</a>
- <a target="_blank" href="https://github.com/sequelize/sequelize-typescript?tab=readme-ov-file#scopes">Sequelize TypeScript Scopes</a>
