<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# CLI Guide

[Back to docs](./index.md)

## Table of Contents

- [Installation](#installation)
- [Creating Projects](#creating-projects)
- [Adding Packages](#adding-packages)
- [Generating Resources](#generating-resources)
- [Cache Management](#cache-management)

## CLI Commands Reference

| Command       | Syntax                            | Description                                 |
| ------------- | --------------------------------- | ------------------------------------------- |
| `new`, `n`    | `nac new [options] [dir]`         | Create a new project in specified directory |
| `add`, `a`    | `nac add [options] <module-name>` | Add a third party module to the application |
| `module`, `m` | `nac module [options] <name>`     | Generate a new module                       |
| `cache`       | `nac cache [options]`             | Manage template cache                       |
| `help`        | `nac help [command]`              | Display help for specific command           |

## Installation

Install CLI globally using your preferred package manager:

```bash
# Using npm
npm i -g @newagesmb/api-cli

# Using yarn
yarn global add @newagesmb/api-cli

# Using pnpm
pnpm add -g @newagesmb/api-cli
```

## Creating Projects

Create a new project with interactive prompts:

```bash
# Interactive mode (recommended)
nac new my-app

# With specific database
nac new my-app --mongo
nac new my-app --sql --mysql
nac new my-app --sql --postgresql

# Skip optional features
nac new my-app --noPackages  # Skip package selection
nac new my-app --noGit       # Skip git initialization
nac new my-app --noInstall   # Skip dependency installation
```

## Adding Packages

Add additional features to existing projects:

```bash
# Add single package
nac add stripe
nac add firebase
nac add email

# Add without installing dependencies
nac add twilio --noInstall
```

Available packages:

- **email** - Email service with templates
- **firebase** - Firebase Admin SDK
- **stripe** - Payment processing
- **square** - Square payments
- **twilio** - SMS and communication
- **geocoder** - Location services
- **recaptcha** - Bot protection

## Generating Resources

Generate new modules and CRUD resources:

```bash
# Generate CRUD module
nac module user-profile

# Generate without tests
nac module payment --noSpec

# Force database engine
nac module order --useMongo
nac module invoice --useSql
```

## Project Structure

Generated projects follow this structure:

```
my-app/
├── libs/                    # Shared library modules
│   ├── mongo/              # MongoDB integration
│   ├── email/              # Email service
│   └── stripe/             # Payment processing
├── src/
│   ├── core/               # Core utilities and decorators
│   ├── config/             # Configuration files
│   ├── modules/            # Feature modules
│   │   ├── mongo/          # MongoDB-specific modules
│   │   └── sql/            # SQL-specific modules
│   └── main.ts
├── test/                   # E2E tests
├── .nac-metadata.json      # CLI metadata
└── package.json
```
