<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Project Setup Guide

[Back to docs](./index.md)

## Table of Contents

- [Creating New Project](#creating-new-project)
- [Project Configuration](#project-configuration)
- [Running the App](#running-the-app)
- [Testing](#test)
- [Production Deployment](#build--production)

## Creating New Project

Create a new NestJS project using our CLI:

```bash
npx @newagesmb/api-cli@latest new <project-name>
```

### CLI Setup Options

During project creation, you'll be prompted to:

1. **Choose Packages**

   ```bash
   ? Which packages would you like to enable?
   ❯ email      # Email integration
     twilio     # SMS integration
     stripe     # Stripe payment
   ```

2. **Select Database Engine**

   ```bash
   ? Choose the default database engine
   ❯ SQL        # SQL databases (MySQL, PostgreSQL)
     MongoDB    # NoSQL database
   ```

3. **Choose SQL Dialect** (if SQL selected)

   ```bash
   ? Which Dialect you want to use in your project?
   ❯ MySQL      # MySQL/MariaDB
     PostgreSQL # PostgreSQL database
   ```

4. **Initialize Git**

   ```bash
   ? Initialize a new git repository? (Y/n)
   ```

5. **Install Dependencies**
   ```bash
   ? Would you like us to run 'npm install'? (Y/n)
   ```

### Project Structure

After creation, your project will have this structure:

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

## Environment Setup

After creating your project, you'll need to configure environment variables. See the [Environment Variables Setup Guide](./env.md) for detailed instructions.

## Running the App

```bash
# development
$ npm run start

# production mode
$ npm run prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov

# testing a service individually
# create a test script under testers/ folder and run using npx
$ npx ts-node -r tsconfig-paths/register testers/twilio-sendSms.ts
```

## Build & Production

```bash
# build
$ npm run build

# start
$ npm run prod:start

# build and start
$ npm run prod
```
