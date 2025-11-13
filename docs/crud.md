<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# CRUD Operations Guide

[Back to docs](./index.md)

## Table of Contents

- [Query Parameters](#query-parameters)
  - [Offset](#offset)
  - [Limit](#limit)
  - [Search](#search)
  - [Select](#select)
  - [Where](#where)
  - [Populate](#populate)
  - [Sort](#sort)
  - [Scope](#scope-sql-only)

## Query Parameters

### Offset

Type: `integer`  
Purpose: Pagination control - specifies number of records to skip

```typescript
offset: 0; // Default - start from beginning
offset: 25; // Skip first 25 records
```

### Limit

Type: `integer`  
Purpose: Pagination control - specifies number of records to fetch

```typescript
limit: 10; // Default - fetch first 10 records
limit: 25; // Fetch 25 records
limit: -1; // Fetch all records (Max 1000)
```

### Search

Type: `string | JSON string - Array`  
Purpose: Full-text search - query string to search within records

```json
// Basic search
"search text"

// Scoped search - specify scope with search text
["scope_name", "search text"]

// Examples:
"john doe"                        // Search for "john doe" in default fields
["name", "john"]                  // Search for "john" in name fields only
["email", "user@example.com"]     // Search for email specifically
```

Notes:

- Search is case-insensitive by default
- When using scoped search, the first element specifies the search scope
- Scopes must be predefined in the model

### Select

Type: `JSON string - Array`  
Purpose: Field selection - specify which fields to include in the response

```json
// Select id and name fields, ignore other fields
["id", "name"]

// Specify select fields from populated tables
["id", "name", "table1.id", "table1.title"]
```

### Where

Type: `JSON string - Object`  
Purpose: Filtering - define conditions for filtering records

```json
// Basic filters
{
  "field_1": "value",
  "field_2": true,
  "field_3": null
}

// Advanced filters
{
  "field_1": { "$ne": "value" },
  "field_2": { "$gte": 5, "$lte": 10 },
  "field_3": { "$in": [1, 2], "$nin": [3, 4] }
}

// Filters on joined tables
{
  "$table_1.field_1$": "value",
  "$table_1.field_2$": { "$gte": 5, "$lte": 10 },
  "$table_2.field_3$": { "$in": [1, 2] }
}
```

### Populate

Type: `JSON string - Array`  
Purpose: Relation inclusion - specify associations to include or join

```json
// Direct relations
["table_1", "table_2"]

// Nested relations
["table_1", "table_1.child_table_1", "table_1.child_table_2"]

// Required relations (suffix *) - return only if relation also exist
["table_1*"]

// Include soft deleted relations (prefix +) - return relation even if deleted
["+table_1", "+table_2*"]

// Fetch relation using separate query  (prefix -) - use separate query to fetch relations (works only for hasMany relation)
["-table_1", "+-table_1"]
```

### Sort

Type: `JSON string - Array`  
Purpose: Sorting - define field(s) to sort the results

```json
// Sort by single field
["field_1"]

// Sort by multiple fields
["field_1", "field_2"]

// Sort direction
[["field_1", "desc"], ["field_2", "asc"]]

// Sort by association table's field
[["table_1", "field_1", "desc"]]
```

### Scope (SQL only)

Type: `JSON string - Array`  
Purpose: Apply predefined conditions - use scopes defined in the model

```json
// Basic scope usage
["active", "verified"]

// Scope with parameters
[["latest", 5], "active"]  // latest 5 active records

// Multiple scopes with parameters
[["dateRange", "2023-01-01", "2023-12-31"], ["status", "completed"]]

// Complex scope combinations
[
  ["category", "electronics"],
  ["priceRange", 100, 500],
  "inStock",
  ["sortBy", "price", "desc"]
]
```

[How to setup scope?](./scope.md)

Common use cases:

- Filtering active/inactive records: `["active"]`
- Date-based filtering: `[["thisMonth"]]`
- Status-based filtering: `[["status", "pending"]]`
- Complex business rules: `["featured", ["region", "US"], "inStock"]`
