# Neo4j Query Builder

This is a simple query builder for Neo4j in NodeJS.

It is intended to be used with the official Neo4j driver for NodeJS.

# Usage

## Path Pattern Builder

This is a class to build the path pattern used in Cypher queries.

Most of the path patterns supported by Cypher are supported by this class.

The basics of the builder is to build the path pattern by chaining the methods from the left to the right.

For example for the path `(a)-[r]->(b)` you can build it like this:

```typescript
import { PathPatternBuilder } from "@jhseong7/neo4j-tookit";

const result = PathPatternBuilder.new()
  .setNode({ alias: "a" })
  .toRelationship({ alias: "r" })
  .toNode({ alias: "b" });

console.log(result);
```

The from/to prefixes are used to indicate the direction of the path.

For example, if you want to express a path `(a)<-[r]-(b)` you can do it like this:

```typescript
import { PathPatternBuilder } from "@jhseong7/neo4j-tookit";

const result = PathPatternBuilder.new()
  .setNode({ alias: "a" })
  .fromRelationship({ alias: "r" })
  .fromNode({ alias: "b" });

console.log(result);
```

### Rules

- The builder should always start with `setNode` or `setRelationship`. (start node)
- The `setNode` and `setRelationship` methods should be used only once. Or else it will throw an error.
- If the builder starts with `setRelationship`, depending on the direction of the next path, a head node expression will automatically be added.
  - e.g.) `setRelationship` -> `toNode` will be converted to `()-[]->()`
  - e.g.) `setRelationship` -> `fromNode` will be converted to `()<-[]-()`

### Limitations

Not all syntaxes are supported. The following are the known, unsupported syntaxes:

- Where clause in the the path pattern
  - e.g.) `(a where a.name = 'John')-[:KNOWS]->(b)`
- ***

## Query Builder

### Usage

> Basic node and relationship query

```typescript
/**
 * MATCH (a)-[r]->(b)
 * RETURN a, r, b
 */
const builder = QueryBuilder.new()
  .match((p) => {
    p.setNode({ alias: "a" });
    .toRelationship({ alias: "r" });
    .toNode({ alias: "b" });
  })
  .return(r => {
    r.add("a")
    .add("r")
    .add("b");
  });
```

> Basic query with where clause

```typescript
/**
 * MATCH (a)-[r]->(b)
 * WHERE a.name = 'John'
 * RETURN a, r, b
 */
const builder = QueryBuilder.new()
  .match((p) => {
    p.setNode({ alias: "a" });
    .toRelationship({ alias: "r" });
    .toNode({ alias: "b" });
  })
  .where((w) => {
    w.add("a.name = 'John'");
  })
  .return(r => {
    r.add("a")
    .add("r")
    .add("b");
  });
```

> Basic query with label and property + AND condition

```typescript
/**
 * MATCH (a:Person { type: "human" })-[r]->(b)
 * WHERE a.name = 'John' AND b.age > 20
 * RETURN a, r, b
 */
const builder = QueryBuilder.new()
  .match((p) => {
    p.setNode({
      alias: "a",
      labels: ["Person"],
      properties: { type: "human" },
    })
    .toRelationship({ alias: "r" });
    .toNode({ alias: "b" });
  })
  .where((w) => {
    w.add("a.name = 'John'")
    .and("b.age > 20");
  })
  .return(r => {
    r.add("a")
    .add("r")
    .add("b");
  });
```

> Basic query with OR clause

```typescript
/**
 * MATCH (a:Person { type: "human" })-[r]->(b)
 * WHERE a.name = 'John' OR b.age > 20
 * RETURN a, r, b
 */
const builder = QueryBuilder.new()
  .match((p) => {
    p.setNode({
      alias: "a",
      labels: ["Person"],
      properties: { type: "human" },
    })
    .toRelationship({ alias: "r" });
    .toNode({ alias: "b" });
  })
  .where((w) => {
    w.add("a.name = 'John'")
    .or("b.age > 20");
  })
  .return(r => {
    r.add("a")
    .add("r")
    .add("b");
  });
```

> Basic query with AND and OR clause with bracketed conditions

```typescript
/**
 * MATCH (a:Person { type: "human" })-[r]->(b)
 * WHERE a.name = 'John' AND (b.age > 20 OR b.age < 10)
 * RETURN a as AliasA, r, b
 */
const builder = QueryBuilder.new()
  .match((p) => {
    p.setNode({
      alias: "a",
      labels: ["Person"],
      properties: { type: "human" },
    })
    .toRelationship({ alias: "r" });
    .toNode({ alias: "b" });
  })
  .where((w) => {
    w.add("a.name = 'John'")
    .and((w) => {
      w.add("b.age > 20")
      .or("b.age < 10");
    });
  })
  .return(r => {
      r.add("a", "AliasA")
      .add("r")
      .add("b");
    });
```

### Limitations

There are many unsupported syntaxes (YET! 😅. Will try to support in the future)

Only the basic syntaxes are supported:

- MATCH
- WHERE
- RETURN
- ORDER BY
- SKIP
- LIMIT
- CREATE
- MERGE (partial support)
