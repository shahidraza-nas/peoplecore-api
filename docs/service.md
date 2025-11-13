<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# Working with Service

[Back to docs](./index.md)

## Table of Contents

- [Search Configuration](#search-configuration)
  - [Basic Search](#basic-search)
  - [Advanced Search](#advanced-search)
  - [Named Search Scopes](#named-search-scopes)
- [Job Customization](#job-customization)
  - [Before Operations](#customize-job-before-read-or-write)
  - [After Operations](#customize-job-response-after-read-or-write)

## Search Configuration

### Basic Search

Simple field search configuration:

```typescript
export class DemoService extends ModelService {
  searchFields: SearchFields<Demo> = ['name', 'description'];
}
```

### Advanced Search

Search with related tables:

```typescript
export class DemoService extends ModelService {
  searchFields: SearchFields<Demo> = ['name', '$table2.name$'];
  searchPopulate: Includeable[] = ['table2'];
}
```

### Named Search Scopes

Configure multiple search scopes with specific fields and relations:

```typescript
export class ProductService extends ModelService<Product> {
  searchFields: SearchFields<Product> = {
    // Default scope - basic search
    default: ['name', 'description'],

    // Search including category
    withCategory: {
      fields: ['name', 'description', '$category.name$'],
      populate: ['category'],
    },

    // Search including vendor and category
    full: {
      fields: [
        'name',
        'description',
        '$category.name$',
        '$vendor.name$',
        '$vendor.email$',
      ],
      populate: ['category', 'vendor'],
    },
  };
}
```

Usage with search parameter:

```typescript
// Basic search using default scope
?search=keyword

// Search using named scope
?search=["withCategory", "keyword"]

// Search using full scope
?search=["full", "keyword"]
```

### Customize job before read or write

- Customize job for all read functions (findAll, getCount, findOne and findById)
  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doBeforeRead
     * @function function will execute before findAll, getCount, findById and findOne function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeRead(job: SqlJob<M>): Promise<void> {
      await super.doBeforeRead(job);
      // customize job here
    }
    ...
  }
  ```
- Customize job for all write functions (create and update)
  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doBeforeWrite
     * @function function will execute before create and update function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeWrite(job: Job): Promise<void> {
      await super.doBeforeWrite(job);
      // customize job here
    }
    ...
  }
  ```
- Customize job for delete function
  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doBeforeDelete
     * @function function will execute before delete function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeDelete(job: Job): Promise<void> {
      await super.doBeforeDelete(job);
      // customize job here
    }
    ...
  }
  ```
- Customize job for specific function

  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doBeforeFindAll
     * @function function will execute before findAll function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeFindAll(job: SqlJob<M>): Promise<void> {
      await super.doBeforeFindAll(job);
      // customize job here
    }

    /**
     * doBeforeFind
     * @function function will execute before findById and findOne function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeFind(job: SqlJob<M>): Promise<void> {
      await super.doBeforeFind(job);
      // customize job here
    }

    /**
     * doBeforeCount
     * @function function will execute before getCount function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeCount(job: SqlJob<M>): Promise<void> {
      await super.doBeforeCount(job);
      // customize job here
    }

    /**
     * doBeforeCreate
     * @function function will execute before create function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeCreate(job: SqlJob<M>): Promise<void> {
      await super.doBeforeCreate(job);
      // customize job here
    }

    /**
     * doBeforeUpdate
     * @function function will execute before update function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeUpdate(job: SqlJob<M>): Promise<void> {
      await super.doBeforeUpdate(job);
      // customize job here
    }
    ...
  }
  ```

- Update where condition to restict job, to access only loggedIn user's records
  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doBeforeRead
     * @function function will execute before findAll, findById and findOne function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeRead(job: Job): Promise<void> {
      await super.doBeforeRead(job);
      job.options.where.user_id = job.owner.id;
    }
    ...
  }
  ```
- Update job body to create record against loggedIn user
  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doBeforeWrite
     * @function function will execute before create and update function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeWrite(job: Job): Promise<void> {
      await super.doBeforeWrite(job);
      job.body.user_id = job.owner.id;
    }
    ...
  }
  ```
- Restrict access by throwing an error
  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doBeforeWrite
     * @function function will execute before create and update function
     * @param {object} job - mandatory - a job object representing the job information
     * @return {void}
     */
    async doBeforeWrite(job: Job): Promise<void> {
      await super.doBeforeWrite(job);
      if (permission === false) {
        throw new Error('Permission Denied');
      }
    }
    ...
  }
  ```

### Customize job response after read or write

- Customize job responses

  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doAfterFind
    * @function function will execute after findById and findOne function
    * @param {object} job - mandatory - a job object representing the job information
    * @param {object} response - mandatory - a object representing the job response information
    * @return {void}
    */
    async doAfterFind(
      job: SqlJob,
      response: SqlGetOneResponse<M>,
    ): Promise<void> {
      await super.doAfterFind(job, response);
      // customize job here
    }

    /**
     * doAfterFindAll
    * @function function will execute after findAll function
    * @param {object} job - mandatory - a job object representing the job information
    * @param {object} response - mandatory - a object representing the job response information
    * @return {void}
    */
    async doAfterFindAll(
      job: SqlJob,
      response: SqlGetAllResponse<M>,
    ): Promise<void> {
      await super.doAfterFindAll(job, response);
      // customize job here
    }

    /**
     * doAfterCount
    * @function function will execute after getCount function
    * @param {object} job - mandatory - a job object representing the job information
    * @param {object} response - mandatory - a object representing the job response information
    * @return {void}
    */
    async doAfterCount(job: SqlJob, response: SqlCountResponse): Promise<void> {
      await super.doAfterCount(job, response);
      // customize job here
    }

    /**
     * doAfterWrite
    * @function function will execute after create and update function
    * @param {object} job - mandatory - a job object representing the job information
    * @param {object} response - mandatory - a object representing the job response information
    * @return {void}
    */
    async doAfterWrite(
      job: SqlJob,
      response: SqlCreateResponse<M> | SqlUpdateResponse<M>,
    ): Promise<void> {
      await super.doAfterWrite(job, response);
      // customize job here
    }

    /**
     * doAfterCreate
    * @function function will execute after create function
    * @param {object} job - mandatory - a job object representing the job information
    * @param {object} response - mandatory - a object representing the job response information
    * @return {void}
    */
    async doAfterCreate(
      job: SqlJob,
      response: SqlCreateResponse<M>,
    ): Promise<void> {
      await super.doAfterCreate(job, response);
      // customize job here
    }

    /**
     * doAfterUpdate
    * @function function will execute after update function
    * @param {object} job - mandatory - a job object representing the job information
    * @param {object} response - mandatory - a object representing the job response information
    * @return {void}
    */
    async doAfterUpdate(
      job: SqlJob,
      response: SqlUpdateResponse<M>,
    ): Promise<void> {
      await super.doAfterUpdate(job, response);
      // customize job here
    }

    /**
     * doAfterDelete
    * @function function will execute after delete function
    * @param {object} job - mandatory - a job object representing the job information
    * @param {object} response - mandatory - a object representing the job response information
    * @return {void}
    */
    async doAfterDelete(
      job: SqlJob,
      response: SqlDeleteResponse<M>,
    ): Promise<void> {
      await super.doAfterDelete(job, response);
      // customize job here
    }
    ...
  }
  ```

- Delete a specific key from each records after findAll function
  ```js
  // src/modules/demo/demo.service.ts
  export class DemoService extends ModelService {
    ...
    /**
     * doAfterFindAll
     * @function function will execute after findAll function
     * @param {object} job - mandatory - a job object representing the job information
     * @param {object} response - mandatory - a object representing the job response information
     * @return {void}
     */
    async doAfterFindAll(
      job: SqlJob,
      response: SqlGetAllResponse<M>,
    ): Promise<void> {
      await super.doAfterFindAll(job, response);
      response.data = response.data.map((x) => {
        delete x.dataValues.unwanted; // removes field with name 'unwanted' from response
        return x;
      });
    }
    ...
  }
  ```
