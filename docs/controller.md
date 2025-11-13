<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Controller Decorators Guide

[Back to docs](./index.md)

## Available Decorators

### Public Access

Skip authentication for public routes:

```typescript
import { Public } from '@core/decorators';

@Public()
@Get('info')
getPublicInfo() {
  return { message: 'Public endpoint' };
}
```

### Role-Based Access

Restrict endpoints to specific user roles:

```typescript
import { Roles } from '@core/decorators';
import { Role } from '@modules/sql/user/role.enum';

@Roles(Role.Admin)
@Get('settings')
getSettings() {
  // Only admins can access
}

@Roles(Role.Admin, Role.Manager)
@Get('reports')
getReports() {
  // Admins and managers can access
}
```

### Owner Attributes

Include specific user attributes in requests:

```typescript
import { OwnerIncludeAttribute } from '@core/decorators';

@OwnerIncludeAttribute('password')
@Get('profile')
getProfile() {
  // Request will include user password field
}
```

### Owner Population

Include related user data in requests:

```typescript
import { OwnerIncludePopulate } from '@core/decorators';

@OwnerIncludePopulate('roles', 'permissions')
@Get('user-details')
getUserDetails() {
  // Will populate user's roles and permissions
}
```

### IP Address

Get client IP address in controllers:

```typescript
import { GetIP } from '@core/decorators';

@Post('login')
login(@GetIP() ip: string) {
  console.log(`Login attempt from IP: ${ip}`);
}
```

### Settings Access

Include and access application settings in your controllers:

```typescript
import { IncludeSettings, Settings, SettingValue } from '@core/decorators';

@Controller('config')
export class ConfigController {
  // Include specific settings
  @IncludeSettings('site_name', 'site_url')
  @Get('site-info')
  getSiteInfo(
    @Settings() settings: Setting[], // Get all included settings
    @Settings('site_name') siteName: Setting, // Get specific setting object
    @SettingValue('site_url') url: string, // Get specific setting value
  ) {
    return {
      settings, // Array of settings
      siteName, // Single setting object
      siteUrl: url, // Setting value
    };
  }

  // Include all settings
  @IncludeSettings()
  @Get('all')
  getAllSettings(@Settings() settings: Setting[]) {
    return settings;
  }
}
```

#### Settings Decorator Types

1. `@IncludeSettings(...keys: string[])`
   - Includes specified settings in the request
   - Empty call includes all settings
2. `@Settings(key?: string)`
   - Gets setting object(s) from request
   - With key: Returns single Setting object
   - Without key: Returns array of Setting objects

3. `@SettingValue(key: string)`
   - Gets setting value directly
   - Returns the value property of the setting

## Combining Decorators

You can combine multiple decorators for complex access control:

```typescript
@Controller('users')
export class UserController {
  @Roles(Role.ADMIN)
  @OwnerIncludeAttribute('email')
  @OwnerIncludePopulate('roles')
  @Get('list')
  async getUsers(@GetIP() ip: string) {
    // Only admins can access
    // Includes user email and roles
    // Logs access IP
  }

  @Public()
  @Get('public-data')
  async getPublicData() {
    // Anyone can access
  }
}
```

## Best Practices

1. Always use `@Public()` for endpoints that don't require authentication
2. Combine role checks with proper data access controls
3. Only include necessary owner attributes and populations
4. Log IP addresses for sensitive operations
5. Layer decorators from most to least specific
