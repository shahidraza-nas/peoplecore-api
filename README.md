<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>


## Description

Core framework developed based on [NestJs](https://github.com/nestjs/nest) framework for application backend.


## Branches && build status


- Main [![GitHub](https://github.com/NewAgeSMBDevelopers/nest-core-v2/actions/workflows/ci-test.yml/badge.svg)](https://github.com/NewAgeSMBDevelopers/nest-core-v2/actions/workflows/ci-test.yml)

- Development [![GitHub](https://github.com/NewAgeSMBDevelopers/nest-core-v2/actions/workflows/ci-test.yml/badge.svg?branch=development)](https://github.com/NewAgeSMBDevelopers/nest-core-v2/actions/workflows/ci-test.yml)
  

## Requirements

- <a href="https://nodejs.org/en/download/" target="_blank">Node Js</a>
- Mysql
- Mongo
- Redis (<a href="https://redis.io/download" target="_blank">Linux</a> | <a href="https://github.com/tporadowski/redis/releases" target="_blank">Windows</a>)
- <a href="https://docs.nestjs.com/#installation" target="_blank">Nest CLI</a>


## Setup

```bash
$ git clone https://github.com/NewAgeSMBDevelopers/nest-core-v2
```


## Installation

```bash
$ npm install
```

## Running the app

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


## Build

```bash
$ npm run build
```


## Documentation

- [Documentation](./docs/index.md)
  

## Code documentation

```bash
$ npx @compodoc/compodoc -p tsconfig.json -s
```


## API documentation

- <a href="http://localhost:3000/docs/" target="_blank">http://localhost:3000/docs/</a>


## References

- <a target="_blank" href="http://es6-features.org/">ES6</a>
- <a target="_blank" href="https://www.typescriptlang.org/docs/">TypeScript</a>
- <a target="_blank" href="https://nestjs.com/">Nest JS</a>
- <a target="_blank" href="https://mongoosejs.com/">Mongoose (MongoDB)</a>
- <a target="_blank" href="https://sequelize.org/master/">Sequelize (SQL ORM)</a>
- <a target="_blank" href="https://github.com/RobinBuschmann/sequelize-typescript">Sequelize TypeScript</a>
- <a target="_blank" href="https://swagger.io/docs/specification/about/">Swagger JS (OpenAPI)</a>
- <a target="_blank" href="http://www.passportjs.org/">Passport JS (Authentication)</a>
- <a target="_blank" href="https://github.com/expressjs/multer">Multer (File upload)</a>
- <a target="_blank" href="https://handlebarsjs.com/">Handlebars JS (HTML template)</a>
- <a target="_blank" href="https://github.com/visionmedia/supertest">SuperTest (Testing)</a>
