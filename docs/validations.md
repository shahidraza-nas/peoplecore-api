<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Form Validation Guide

[Back to docs](./index.md)

## Table of Contents

- [Basic Validations](#basic-validations)
- [Conditional Validation](#conditional-validation)
- [Custom Validations](#custom-validations)
- [Unique Field Validation](#unique-field-validations)

## Basic Validations

### Type Validations

```typescript
@IsString()        // Validates string type
@IsInt()           // Validates integer type
@IsBoolean()       // Validates boolean type
@IsDate()          // Validates date type
```

### Range Validations

```typescript
@Min(0)            // Minimum value
@Max(100)          // Maximum value
@Length(3, 20)     // String length between 3 and 20
```

### Example

```typescript
@Table
export class Demo {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  num_field: number;

  @IsString()
  name: string;

  ...
}
```

## Conditional Validation

- ValidateIf (Ignore the validators on a property when the provided condition function returns false)

  ```js
  @Table
  export class Demo {
    @IsString()
    type: string;

    @ValidateIf((o) => o.type === 'message') // body object can be accessed from first argument
    @IsString()
    message: string;

    @ValidateIf((o, v) => o.type === 'image' && typeof v !== 'undefined') // second argument will be the value of active field
    @IsString()
    image: string;

    ...
  }
  ```

## Custom Validations

- Validate by comparing another field value

  ```js
  import { IsEqual, IsGreaterThan, IsGreaterThanEqual } from 'src/core/decorators/validation.decorator';

  @Table
  export class Demo {
    // validate min and max number fields
    @IsInt()
    @IsPositive()
    min_amount: number;

    @IsInt()
    @IsPositive()
    @IsGreaterThan('min_amount', {
      message: 'Maximum amount should be greater than minimum amount',
    })
    max_amount: number;

    // validate start and end dates
    @IsDateString()
    start_date: Date;

    @IsDateString()
    @IsGreaterThanEqual('start_date')
    end_date: Date;

    // validate confirm password
    @IsString()
    password: string;

    @IsString()
    @IsEqual('password', {
      message: 'Passwords doesn\'t match',
    })
    confirm_password: string;

    ...
  }
  ```

## Unique Field Validation

- Unique value for a field

  ```js
  import { IsUnique } from '@core/sql/sql.unique-validator';
  // OR
  // import { IsUnique } from '@core/mongo/mongo.unique-validator';

  @Table
  export class User {
    // unique field
    @IsString()
    @IsEmail()
    @IsUnique('User')
    email: string;
    ...
  }
  ```

- Unique value for a field (custom options)

  ```js
  import { IsUnique } from '@core/sql/sql.unique-validator';
  // OR
  // import { IsUnique } from '@core/mongo/mongo.unique-validator';

  @Table
  export class Product {
    // unique field
    @IsString()
    @IsUnique({
      modelName: 'Product',
      options: {
        paranoid: false, // also include deleted records
        ... // other find options
      },
    })
    name: string;
    ...
  }
  ```

- Unique value for a field (combination with another field)

  ```js
  import { IsUnique } from '@core/sql/sql.unique-validator';
  // OR
  // import { IsUnique } from '@core/mongo/mongo.unique-validator';

  @Table
  export class Product {
    // unique field
    @IsString()
    @IsUnique({
      modelName: 'Product',
      options(args: ValidationArguments) {
        const product = args.object as Product;
        return {
          where: {
            name: product.name,
            category_id: product.category_id, // check if same `name` with same `category_id` exists
          },
          ... // other find options
        };
      },
    })
    name: string;

    @IsString()
    category_id: number;
    ...
  }
  ```

### References

- <a target="_blank" href="https://github.com/typestack/class-validator">class-validator</a>
- <a target="_blank" href="https://docs.nestjs.com/techniques/validation">Nest JS validation</a>
