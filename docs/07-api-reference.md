# API Reference

## Table of Contents

1. [Core Classes](#core-classes)
2. [Type Definitions](#type-definitions)
3. [Exceptions](#exceptions)
4. [Utility Functions](#utility-functions)

---

## Core Classes

### QueryBuilder

Main class for building Cypher queries.

#### Static Methods

```typescript
static new(): QueryBuilder
```

Creates a new QueryBuilder instance.

#### Selective Clause Methods

```typescript
match(...builders: PathBuilderFunction[]): QueryBuilder
```

Adds a MATCH clause with one or more path patterns.

**Parameters:**
- `builders`: Functions that configure path patterns

**Returns:** `this` (for chaining)

**Example:**
```typescript
qb.match(p => p.setNode({ alias: 'n' }))
```

---

```typescript
addMatch(builder: PathBuilderFunction): QueryBuilder
```

Adds another path pattern to existing MATCH clause.

---

```typescript
optionalMatch(...builders: PathBuilderFunction[]): QueryBuilder
```

Adds an OPTIONAL MATCH clause.

---

```typescript
addOptionalMatch(builder: PathBuilderFunction): QueryBuilder
```

Adds another path pattern to existing OPTIONAL MATCH clause.

---

```typescript
create(...builders: PathBuilderFunction[]): QueryBuilder
```

Adds a CREATE clause.

---

```typescript
addCreate(builder: PathBuilderFunction): QueryBuilder
```

Adds another path pattern to existing CREATE clause.

---

```typescript
merge(...builders: PathBuilderFunction[]): QueryBuilder
```

Adds a MERGE clause.

---

```typescript
addMerge(builder: PathBuilderFunction): QueryBuilder
```

Adds another path pattern to existing MERGE clause.

#### Filtering Methods

```typescript
where(builder: WhereClauseBuilderFunction): QueryBuilder
```

Adds a WHERE clause.

**Parameters:**
- `builder`: Function that configures WHERE conditions

**Returns:** `this` (for chaining)

**Example:**
```typescript
qb.where(w => w.add('n.age > 25').and('n.city = "NYC"'))
```

---

```typescript
addWhere(builder: WhereClauseBuilderFunction): QueryBuilder
```

Extends existing WHERE clause.

#### Projection Methods

```typescript
return(statement: string, alias?: string): QueryBuilder
return(statements: string[]): QueryBuilder
return(builder: ReturnQueryBuilderFunction): QueryBuilder
return(builder: ReturnClauseBuilder): QueryBuilder
```

Adds a RETURN clause (overloaded method).

**Parameters:**
- `statement`: Property/expression to return
- `alias`: Optional alias for the return value
- `statements`: Array of properties to return
- `builder`: Builder function or instance

**Example:**
```typescript
qb.return('n')
qb.return(['n', 'm', 'r'])
qb.return('n.name', 'personName')
qb.return(r => r.add('n').add('m'))
```

---

```typescript
addReturn(statement: string, alias?: string): QueryBuilder
```

Adds another statement to existing RETURN clause.

#### Sorting Methods

```typescript
orderBy(statement: string, direction?: 'ASC' | 'DESC'): QueryBuilder
orderBy(builder: OrderByBuilderFunction): QueryBuilder
orderBy(builder: OrderByClauseBuilder): QueryBuilder
```

Adds an ORDER BY clause.

**Parameters:**
- `statement`: Property to sort by
- `direction`: Sort direction (default: 'ASC')
- `builder`: Builder function or instance

**Example:**
```typescript
qb.orderBy('n.name', 'ASC')
qb.orderBy(o => o.add('n.name', 'ASC').add('n.age', 'DESC'))
```

---

```typescript
addOrderBy(statement: string, direction?: 'ASC' | 'DESC'): QueryBuilder
```

Adds another sort criterion to existing ORDER BY.

#### Pagination Methods

```typescript
skip(skip: number): QueryBuilder
```

Sets SKIP value for pagination.

---

```typescript
limit(limit: number): QueryBuilder
```

Sets LIMIT value for pagination.

---

```typescript
offset(offset: number): QueryBuilder
```

Sets OFFSET value for pagination.

#### Completion Methods

```typescript
finish(): QueryBuilder
```

Marks query as complete without RETURN clause.

---

```typescript
toParameterizedQuery(): ParameterizedQuery
```

Generates the final parameterized query.

**Returns:** Object with `query`, `parameters`, and `aliasSet`

**Example:**
```typescript
const { query, parameters } = qb.toParameterizedQuery();
// query: "MATCH (n:Person) RETURN n\n"
// parameters: {}
```

---

```typescript
toRawQuery(): string
```

Generates the final query with inlined parameters (for debugging).

**Returns:** String with parameters replaced

---

### PathPatternBuilder

Builder for graph path patterns.

#### Static Methods

```typescript
static new(): PathPatternBuilder
```

Creates a new PathPatternBuilder instance.

#### Setup Methods

```typescript
setNode(node: NodePatternBuilderContructor): PathPatternBuilder
```

Sets the starting node of the path.

**Parameters:**
- `node`: Configuration object for the node

**Example:**
```typescript
p.setNode({ alias: 'n', labels: ['Person'], properties: { name: 'Alice' } })
```

---

```typescript
setRelationship(rel: RelationPatternBuilderContructor): PathPatternBuilder
```

Sets the starting relationship of the path (ghost node will be added).

#### Connection Methods

```typescript
toNode(node: NodePatternBuilderContructor): PathPatternBuilder
```

Adds a node with outgoing direction (-->).

---

```typescript
fromNode(node: NodePatternBuilderContructor): PathPatternBuilder
```

Adds a node with incoming direction (<--).

---

```typescript
addNode(node: NodePatternBuilderContructor): PathPatternBuilder
```

Adds an undirected node (--).

---

```typescript
toRelationship(rel: RelationPatternBuilderContructor): PathPatternBuilder
```

Adds an outgoing relationship (-[]).

---

```typescript
fromRelationship(rel: RelationPatternBuilderContructor): PathPatternBuilder
```

Adds an incoming relationship (<-[]).

#### Advanced Methods

```typescript
shortestPath(alias: string, length?: number): PathPatternBuilder
shortestPath(options: ShortestPathOptions): PathPatternBuilder
```

Configures shortest path pattern.

**Options:**
```typescript
type ShortestPathOptions = {
  alias: string;
  length?: number;
  isAll?: boolean;
  isGroup?: boolean;
}
```

#### Output Methods

```typescript
toParameterizedQuery(): ParameterizedQuery
```

Generates the path pattern query.

---

```typescript
toRawQuery(): string
```

Generates the path pattern with inlined parameters.

---

### NodePatternBuilder

Builder for node patterns.

#### Constructor

```typescript
new NodePatternBuilder(config?: NodePatternBuilderContructor)
```

**Config:**
```typescript
type NodePatternBuilderContructor = {
  alias?: string;
  labels?: string[];
  properties?: Neo4jProperties;
}
```

#### Methods

```typescript
setAlias(alias: string): NodePatternBuilder
```

Sets the node alias.

---

```typescript
addLabel(label: string): NodePatternBuilder
```

Adds a label to the node.

---

```typescript
addProperty(key: string, value: Neo4jPrimitive): NodePatternBuilder
```

Adds a property to the node.

---

```typescript
toParameterizedQuery(): ParameterizedQuery
```

Generates the node pattern.

---

### RelationPatternBuilder

Builder for relationship patterns.

#### Constructor

```typescript
new RelationPatternBuilder(config?: RelationPatternBuilderContructor)
```

**Config:**
```typescript
type RelationPatternBuilderContructor = {
  alias?: string;
  label?: string;  // Single label only!
  properties?: Neo4jProperties;
}
```

#### Methods

```typescript
setAlias(alias: string): RelationPatternBuilder
```

Sets the relationship alias.

---

```typescript
setLabel(label: string): RelationPatternBuilder
```

Sets the relationship type (single label).

---

```typescript
addProperty(key: string, value: Neo4jPrimitive): RelationPatternBuilder
```

Adds a property to the relationship.

---

```typescript
toParameterizedQuery(): ParameterizedQuery
```

Generates the relationship pattern.

---

### WhereClauseBuilder

Builder for WHERE conditions.

#### Methods

```typescript
add(statement: string, parameters?: Neo4jProperties): WhereClauseBuilder
```

Adds a condition statement.

**Parameters:**
- `statement`: Cypher condition expression
- `parameters`: Optional parameters for the statement

**Example:**
```typescript
w.add('n.age > $age', { age: 25 })
```

---

```typescript
and(statement: string, parameters?: Neo4jProperties): WhereClauseBuilder
and(builder: WhereClauseBuilderFunction): WhereClauseBuilder
```

Adds an AND condition.

---

```typescript
or(statement: string, parameters?: Neo4jProperties): WhereClauseBuilder
or(builder: WhereClauseBuilderFunction): WhereClauseBuilder
```

Adds an OR condition.

---

```typescript
bracket(builder: WhereClauseBuilderFunction): WhereClauseBuilder
```

Creates a bracketed sub-condition.

**Example:**
```typescript
w.bracket(b => b
  .add('n.city = "NYC"')
  .or('n.city = "LA"')
)
// Generates: (n.city = "NYC" OR n.city = "LA")
```

---

```typescript
setAliasList(aliases: string[]): void
```

Injects available aliases for validation (called automatically by QueryBuilder).

---

```typescript
toParameterizedQuery(): ParameterizedQuery
```

Generates the WHERE clause.

---

### ReturnClauseBuilder

Builder for RETURN clauses.

#### Methods

```typescript
add(statement: string, alias?: string): ReturnClauseBuilder
```

Adds a return statement.

**Parameters:**
- `statement`: Property/expression to return
- `alias`: Optional alias

**Example:**
```typescript
r.add('n')
r.add('n.name', 'personName')
```

---

```typescript
setAliasList(aliases: string[]): void
```

Injects available aliases for validation.

---

```typescript
toParameterizedQuery(): ParameterizedQuery
```

Generates the RETURN clause.

---

### OrderByClauseBuilder

Builder for ORDER BY clauses.

#### Methods

```typescript
add(statement: string, direction?: 'ASC' | 'DESC'): OrderByClauseBuilder
```

Adds an ORDER BY criterion.

**Parameters:**
- `statement`: Property to sort by
- `direction`: Sort direction (default: 'ASC')

---

```typescript
setAliasList(aliases: string[]): void
```

Injects available aliases for validation.

---

```typescript
toParameterizedQuery(): ParameterizedQuery
```

Generates the ORDER BY clause.

---

### SessionPoolManager

Manages a pool of Neo4j sessions.

#### Constructor

```typescript
new SessionPoolManager(params: SessionPoolConstructorParams)
```

**Params:**
```typescript
type SessionPoolConstructorParams = {
  neo4jDriver: Driver;
  numberOfSessions?: number;      // Default: 10
  idleTimeoutMs?: number;         // Optional
}
```

#### Methods

```typescript
getSession(): { session: Session; done: () => void }
```

Gets a session from the pool.

**Returns:** Object with `session` (proxied) and `done` callback

**Throws:** `NoSessionException` if pool is exhausted

**Example:**
```typescript
const { session, done } = pool.getSession();
try {
  const result = await session.run(query, params);
} finally {
  done();
}
```

---

```typescript
async shutdown(stopDriver?: boolean): Promise<void>
```

Shuts down the pool and optionally the driver.

**Parameters:**
- `stopDriver`: Whether to close the driver (default: true)

---

### Neo4jManager

High-level facade for Neo4j operations.

#### Constructor

```typescript
new Neo4jManager(params: ManagerConstructorParams)
```

**Params:**
```typescript
type ManagerConstructorParams = {
  driver: {
    url: string;
    authToken?: AuthToken | AuthTokenManager;
    config?: Config;
  };
  pool: {
    numberOfSessions?: number;
    idleTimeoutMs?: number;
  };
}
```

#### Methods

```typescript
async runQuery(query: string, params?: Neo4jProperties): Promise<QueryResult>
async runQuery(builder: (q: QueryBuilder) => void): Promise<QueryResult>
```

Executes a query (overloaded).

**Parameters:**
- `query`: Raw Cypher query string
- `params`: Query parameters
- `builder`: Query builder function

**Returns:** Neo4j QueryResult

**Example:**
```typescript
// Raw query
const result = await manager.runQuery(
  "MATCH (n:Person) RETURN n"
);

// Builder
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'n', labels: ['Person'] }))
    .return('n');
});
```

---

```typescript
getSession(): { session: Session; done: () => void }
```

Gets a session from the pool for manual management.

---

## Type Definitions

### Neo4jPrimitive

```typescript
type Neo4jPrimitive =
  | string
  | number
  | boolean
  | (string | number | boolean)[]
  | null
  | undefined
  | (() => string);  // For function expressions
```

Represents valid Neo4j property values.

---

### Neo4jProperties

```typescript
type Neo4jProperties = Record<string, Neo4jPrimitive>;
```

Object representing Neo4j properties.

---

### ParameterizedQuery

```typescript
type ParameterizedQuery = {
  aliasSet?: Set<string>;
  query: string;
  parameters: Neo4jProperties;
}
```

Result of query building process.

---

### PathBuilderFunction

```typescript
type PathBuilderFunction = (p: PathPatternBuilder) => unknown;
```

Function type for configuring path patterns.

---

### WhereClauseBuilderFunction

```typescript
type WhereClauseBuilderFunction = (w: WhereClauseBuilder) => unknown;
```

Function type for configuring WHERE conditions.

---

### ReturnQueryBuilderFunction

```typescript
type ReturnQueryBuilderFunction = (r: ReturnClauseBuilder) => unknown;
```

Function type for configuring RETURN clauses.

---

### OrderByBuilderFunction

```typescript
type OrderByBuilderFunction = (o: OrderByClauseBuilder) => unknown;
```

Function type for configuring ORDER BY clauses.

---

### NodePatternBuilderContructor

```typescript
type NodePatternBuilderContructor = {
  alias?: string;
  labels?: string[];
  properties?: Neo4jProperties;
}
```

Configuration for creating node patterns.

---

### RelationPatternBuilderContructor

```typescript
type RelationPatternBuilderContructor = {
  alias?: string;
  label?: string;  // Single label only
  properties?: Neo4jProperties;
}
```

Configuration for creating relationship patterns.

---

### ShortestPathOptions

```typescript
type ShortestPathOptions = {
  alias: string;
  length?: number;
  isAll?: boolean;
  isGroup?: boolean;
}
```

Options for shortest path patterns.

---

## Exceptions

### QueryBuilderException

```typescript
class QueryBuilderException extends Error {
  constructor(message: string)
}
```

Thrown for query building errors (invalid structure, missing aliases, etc.).

---

### StartNodeNotSetException

```typescript
class StartNodeNotSetException extends QueryBuilderException {
  constructor()
}
```

Thrown when attempting to connect nodes/relationships without a starting element.

---

### NoSessionException

```typescript
class NoSessionException extends Error {
  constructor()
}
```

Thrown when the session pool is exhausted.

---

## Utility Functions

### replaceQueryParameters

```typescript
function replaceQueryParameters(
  query: string,
  parameters: Neo4jProperties
): string
```

Replaces parameter placeholders in query with actual values (for debugging).

**Example:**
```typescript
const query = "MATCH (n {name: $name})";
const params = { name: "Alice" };
const result = replaceQueryParameters(query, params);
// Result: "MATCH (n {name: 'Alice'})"
```

---

### mergeProperties

```typescript
function mergeProperties(
  target: Neo4jProperties,
  source: Neo4jProperties
): void
```

Merges source properties into target (mutates target).

---

### randomizeParameterKeys

```typescript
function randomizeParameterKeys(
  statement: string,
  parameters: Neo4jProperties
): { statement: string; parameters: Neo4jProperties }
```

Adds random suffixes to parameter keys to prevent collisions.

**Example:**
```typescript
const input = {
  statement: "n.age > $age",
  parameters: { age: 25 }
};

const result = randomizeParameterKeys(input.statement, input.parameters);
// result.statement: "n.age > $age_a7f3d9c2"
// result.parameters: { age_a7f3d9c2: 25 }
```

---

**Next:** [Advanced Patterns & Best Practices →](./08-advanced-patterns.md)
