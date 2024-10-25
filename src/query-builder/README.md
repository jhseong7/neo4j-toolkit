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
