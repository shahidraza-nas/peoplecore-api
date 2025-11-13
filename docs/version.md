<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Version Management

[Back to docs](./index.md)

## Overview

Version management allows you to maintain multiple versions of your API endpoints simultaneously. This is useful when you need to introduce breaking changes while maintaining backward compatibility.

## Configuration

Version configuration is managed in `app.config.ts`:

```typescript
export const APP_VERSION = 2; // Latest API version
export const APP_MIN_VERSION = 1; // Minimum supported version
```

## Version Decorators

### @ForVersion(version: number)

Use for endpoints that should only be available for a specific version:

```typescript
@ForVersion(1)
@Get('users')
getUsersV1() {
  // Only accessible with version 1
}
```

### @FromVersion(version: number)

Use for endpoints that should be available from a specific version onwards:

```typescript
@FromVersion(2)
@Get('users')
getUsersV2() {
  // Accessible from version 2 and up
}
```

### @TillVersion(version: number)

Use for endpoints that should be available up to a specific version:

```typescript
@TillVersion(2)
@Get('users')
getLegacyUsers() {
  // Accessible from min version up to version 2
}
```

### @BetweenVersions(from: number, to: number)

Use for endpoints that should be available for a specific version range:

```typescript
@BetweenVersions(1, 2)
@Get('users')
getMidVersionUsers() {
  // Only accessible between versions 1 and 2
}
```

## Usage Example

Here's how to implement versioned endpoints in a controller:

```typescript
@Controller('users')
export class UserController {
  // Version 1 implementation
  @ForVersion(1)
  @Get('me')
  getUserV1() {
    return 'Version 1 response';
  }

  // Version 2 and above implementation
  @FromVersion(2)
  @Get('me')
  getUserV2() {
    return 'Version 2+ response';
  }
}
```

## Client Usage

Clients can specify the desired API version using the `x-application-version` header:

```bash
# Request version 1
curl -H "x-application-version: 1" http://api.example.com/users

# Request version 2
curl -H "x-application-version: 2" http://api.example.com/users
```

## Best Practices

1. Always set appropriate `APP_VERSION` and `APP_MIN_VERSION`
2. Document breaking changes between versions
3. Use `@FromVersion` for new features
4. Use `@ForVersion` for version-specific implementations
5. Consider deprecation strategy for old versions
6. Test all supported versions when making changes
