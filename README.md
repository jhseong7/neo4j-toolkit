WIP pre-alpha stage - not ready for production use. The specification is subject to change anytime.

# Neo4j Toolkit for NodeJS

A TypeScript library providing a fluent, type-safe interface for building and executing Neo4j Cypher queries with advanced session pooling and query building capabilities.

[![npm version](https://img.shields.io/npm/v/@jhseong7/neo4j-toolkit.svg)](https://www.npmjs.com/package/@jhseong7/neo4j-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Fluent Query Builder** - Type-safe, chainable API for building complex Cypher queries
- 🚀 **Session Pooling** - 500-1000x performance improvement through connection reuse
- 🔒 **Auto Parameterization** - Prevents SQL injection with automatic parameter handling
- ✅ **Alias Validation** - Build-time validation of aliases prevents runtime errors
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive type definitions
- 🔄 **Graceful Shutdown** - Automatic cleanup on process signals
- 📦 **All-in-One Manager** - High-level facade combining driver, pool, and query builder

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Examples](#examples)
  - [Basic Queries](#basic-queries)
  - [Graph Relationships](#graph-relationships)
  - [Filtering with WHERE](#filtering-with-where)
  - [Creating and Updating Data](#creating-and-updating-data)
  - [Advanced Patterns](#advanced-patterns)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
# NPM
npm install @jhseong7/neo4j-toolkit neo4j-driver

# Yarn
yarn add @jhseong7/neo4j-toolkit neo4j-driver

# pnpm
pnpm add @jhseong7/neo4j-toolkit neo4j-driver
```

**Note:** `neo4j-driver` is a peer dependency and must be installed separately.

## Quick Start

```typescript
import { Neo4jManager } from '@jhseong7/neo4j-toolkit';
import Neo4j from 'neo4j-driver';

// 1. Create manager instance
const manager = new Neo4jManager({
  driver: {
    url: 'neo4j://localhost:7687',
    authToken: Neo4j.auth.basic('neo4j', 'password')
  },
  pool: {
    numberOfSessions: 10
  }
});

// 2. Execute queries with the fluent query builder
const result = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({ alias: 'person', labels: ['Person'] })
      .toRelationship({ label: 'KNOWS' })
      .toNode({ alias: 'friend', labels: ['Person'] })
    )
    .where(w => w.add('person.age > $minAge', { minAge: 25 }))
    .return(['person.name', 'friend.name'])
    .limit(10);
});

// 3. Process results
for (const record of result.records) {
  console.log({
    person: record.get('person.name'),
    friend: record.get('friend.name')
  });
}
```

## Core Concepts

### Architecture

```
┌────────────────────────────────────────┐
│         Your Application               │
├────────────────────────────────────────┤
│  Neo4jManager (Facade)                 │
├──────────────┬─────────────────────────┤
│ QueryBuilder │ SessionPoolManager      │
├──────────────┴─────────────────────────┤
│         Neo4j Driver                   │
├────────────────────────────────────────┤
│         Neo4j Database                 │
└────────────────────────────────────────┘
```

### Key Components

1. **Neo4jManager** - High-level facade for simplified Neo4j operations
2. **QueryBuilder** - Fluent API for constructing type-safe Cypher queries
3. **SessionPoolManager** - Efficient connection pooling (500-1000x faster!)
4. **PathPatternBuilder** - Build complex graph patterns

## Examples

### Basic Queries

#### Find All Nodes

```typescript
// Using query builder
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'n',
      labels: ['Person']
    }))
    .return('n')
    .limit(10);
});

// Using raw Cypher
const result = await manager.runQuery(
  "MATCH (n:Person) RETURN n LIMIT 10"
);
```

#### Find Node by Property

```typescript
async function findPersonByName(name: string) {
  return await manager.runQuery(qb => {
    qb.match(p => p.setNode({
        alias: 'person',
        labels: ['Person'],
        properties: { name }
      }))
      .return('person');
  });
}

const alice = await findPersonByName('Alice');
```

#### Return Multiple Properties

```typescript
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'p',
      labels: ['Person']
    }))
    .return(['p.name', 'p.age', 'p.city'])
    .orderBy('p.name', 'ASC')
    .limit(100);
});

// Access results
for (const record of result.records) {
  console.log({
    name: record.get('p.name'),
    age: record.get('p.age'),
    city: record.get('p.city')
  });
}
```

#### Pagination

```typescript
async function getPaginatedPeople(page: number, pageSize: number) {
  const skip = page * pageSize;

  return await manager.runQuery(qb => {
    qb.match(p => p.setNode({
        alias: 'p',
        labels: ['Person']
      }))
      .return('p')
      .orderBy('p.name', 'ASC')
      .skip(skip)
      .limit(pageSize);
  });
}

// Usage
const page1 = await getPaginatedPeople(0, 10);  // First 10
const page2 = await getPaginatedPeople(1, 10);  // Next 10
```

### Graph Relationships

#### Simple Relationships

```typescript
// Who knows whom
const result = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({ alias: 'person', labels: ['Person'] })
      .toRelationship({ alias: 'knows', label: 'KNOWS' })
      .toNode({ alias: 'friend', labels: ['Person'] })
    )
    .return(['person.name', 'friend.name']);
});
```

#### Multi-Hop Relationships

```typescript
// Friend of a friend
const result = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({ alias: 'person', labels: ['Person'] })
      .toRelationship({ label: 'KNOWS' })
      .toNode({ alias: 'friend', labels: ['Person'] })
      .toRelationship({ label: 'KNOWS' })
      .toNode({ alias: 'foaf', labels: ['Person'] })
    )
    .where(w => w.add('person <> foaf'))  // Not the same person
    .return(['person.name', 'foaf.name']);
});
```

#### Shortest Path

```typescript
// Find shortest path between two people
const result = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({
        alias: 'start',
        labels: ['Person'],
        properties: { name: 'Alice' }
      })
      .toRelationship({ alias: 'rel', label: 'KNOWS' })
      .toNode({
        alias: 'end',
        labels: ['Person'],
        properties: { name: 'Bob' }
      })
      .shortestPath({ alias: 'path', length: 1 })
    )
    .return(['path', 'length(path) as pathLength']);
});
```

#### Multiple Patterns

```typescript
// Find people who live in the same city
const result = await manager.runQuery(qb => {
  qb.match(
      p => p.setNode({ alias: 'p1', labels: ['Person'] }),
      p => p.setNode({ alias: 'p2', labels: ['Person'] })
    )
    .where(w => w
      .add('p1.city = p2.city')
      .and('p1 <> p2')  // Different people
    )
    .return(['p1.name', 'p2.name', 'p1.city']);
});
```

### Filtering with WHERE

#### Simple Conditions

```typescript
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
    .where(w => w.add('p.age > $minAge', { minAge: 25 }))
    .return('p');
});
```

#### AND Conditions

```typescript
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
    .where(w => w
      .add('p.age > $minAge', { minAge: 25 })
      .and('p.age < $maxAge', { maxAge: 65 })
      .and('p.city = $city', { city: 'NYC' })
    )
    .return('p');
});
```

#### OR Conditions

```typescript
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
    .where(w => w
      .add('p.city = $city1', { city1: 'NYC' })
      .or('p.city = $city2', { city2: 'LA' })
      .or('p.city = $city3', { city3: 'SF' })
    )
    .return('p');
});
```

#### Complex Nested Conditions

```typescript
// (age > 25 OR age < 18) AND (city = 'NYC' OR city = 'LA')
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
    .where(w => w
      .add('p.age > 25')
      .or('p.age < 18')
      .and('p.city = "NYC"')
      .or('p.city = "LA"')
    )
    .return('p');
});
```

### Creating and Updating Data

#### Create Single Node

```typescript
const result = await manager.runQuery(qb => {
  qb.create(p => p.setNode({
      alias: 'person',
      labels: ['Person'],
      properties: {
        name: 'Alice',
        age: 30,
        city: 'NYC'
      }
    }))
    .return('person');
});
```

#### Create with Relationships

```typescript
const result = await manager.runQuery(qb => {
  qb.create(p => p
      .setNode({
        alias: 'person',
        labels: ['Person'],
        properties: { name: 'Alice' }
      })
      .toRelationship({
        alias: 'knows',
        label: 'KNOWS',
        properties: { since: 2020 }
      })
      .toNode({
        alias: 'friend',
        labels: ['Person'],
        properties: { name: 'Bob' }
      })
    )
    .return(['person', 'knows', 'friend']);
});
```

#### MERGE (Create or Match)

```typescript
// Create person if doesn't exist
const result = await manager.runQuery(qb => {
  qb.merge(p => p.setNode({
      alias: 'person',
      labels: ['Person'],
      properties: { email: 'alice@example.com' }
    }))
    .return('person');
});
```

#### Update Properties

```typescript
const result = await manager.runQuery(
  `MATCH (p:Person {name: $name})
   SET p.age = $newAge, p.updated = timestamp()
   RETURN p`,
  { name: 'Alice', newAge: 31 }
);
```

#### Batch Operations

```typescript
async function batchCreatePeople(
  people: Array<{ name: string; age: number; city: string }>
) {
  const { session, done } = manager.getSession();

  try {
    await session.writeTransaction(async tx => {
      for (const person of people) {
        await tx.run(
          "CREATE (p:Person {name: $name, age: $age, city: $city})",
          person
        );
      }
    });
  } finally {
    done();
  }
}

// Usage
await batchCreatePeople([
  { name: 'Alice', age: 30, city: 'NYC' },
  { name: 'Bob', age: 25, city: 'LA' },
  { name: 'Charlie', age: 35, city: 'SF' }
]);
```

### Advanced Patterns

#### Aggregations

```typescript
// Count people per city
const result = await manager.runQuery(
  `MATCH (p:Person)
   RETURN p.city as city, count(p) as population
   ORDER BY population DESC`
);

// Average age by city
const result2 = await manager.runQuery(
  `MATCH (p:Person)
   RETURN p.city as city, avg(p.age) as avgAge
   ORDER BY avgAge DESC`
);
```

#### Collect Results

```typescript
// Collect all friends for each person
const result = await manager.runQuery(
  `MATCH (p:Person)-[:KNOWS]->(friend:Person)
   RETURN p.name as person, collect(friend.name) as friends`
);

for (const record of result.records) {
  console.log(
    record.get('person'),
    'knows:',
    record.get('friends')
  );
}
```

#### Friend Recommendations

```typescript
async function getFriendRecommendations(userName: string, limit: number = 10) {
  return await manager.runQuery(
    `// Find friends of friends who are not already friends
     MATCH (user:Person {name: $userName})-[:KNOWS]->(:Person)-[:KNOWS]->(foaf:Person)
     WHERE NOT (user)-[:KNOWS]->(foaf) AND user <> foaf
     WITH foaf, count(*) as commonFriends
     RETURN foaf.name as recommendedFriend, commonFriends
     ORDER BY commonFriends DESC
     LIMIT $limit`,
    { userName, limit }
  );
}

const recommendations = await getFriendRecommendations('Alice', 5);
```

#### Path Analysis

```typescript
const result = await manager.runQuery(
  `MATCH path = (a:Person {name: $start})-[:KNOWS*1..3]-(b:Person)
   WHERE a <> b
   RETURN b.name as person,
          length(path) as distance,
          [n in nodes(path) | n.name] as pathNames
   ORDER BY distance`,
  { start: 'Alice' }
);
```

#### CASE Expressions

```typescript
const result = await manager.runQuery(
  `MATCH (p:Person)
   RETURN p.name as name,
          CASE
            WHEN p.age < 18 THEN 'Minor'
            WHEN p.age < 65 THEN 'Adult'
            ELSE 'Senior'
          END as category`
);
```

## API Overview

### Neo4jManager

The main entry point for interacting with Neo4j.

```typescript
// Create manager
const manager = new Neo4jManager({
  driver: {
    url: 'neo4j://localhost:7687',
    authToken: Neo4j.auth.basic('neo4j', 'password'),
    config?: {
      maxConnectionLifetime: 3600000,
      maxConnectionPoolSize: 50
    }
  },
  pool: {
    numberOfSessions?: 10,
    idleTimeoutMs?: 300000
  }
});

// Execute query with builder
await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'n' })).return('n');
});

// Execute raw query
await manager.runQuery(
  "MATCH (n:Person) RETURN n",
  { /* parameters */ }
);

// Get session for manual control
const { session, done } = manager.getSession();
try {
  await session.run(query, params);
} finally {
  done();
}
```

### QueryBuilder

Fluent API for building Cypher queries.

```typescript
import { QueryBuilder } from '@jhseong7/neo4j-toolkit';

const qb = QueryBuilder.new()
  // Selective clauses (define aliases)
  .match(p => p.setNode({ alias: 'n', labels: ['Person'] }))
  .optionalMatch(p => p.setNode({ alias: 'n' }).toRelationship({ label: 'KNOWS' }).toNode({ alias: 'm' }))
  .create(p => p.setNode({ alias: 'x' }))
  .merge(p => p.setNode({ alias: 'y' }))

  // Filtering
  .where(w => w.add('n.age > $age', { age: 25 }))

  // Projection
  .return(['n', 'm'])

  // Sorting and pagination
  .orderBy('n.name', 'ASC')
  .skip(10)
  .limit(20)

  // Generate query
  .toParameterizedQuery();

// Result: { query: string, parameters: object, aliasSet: Set<string> }
```

### SessionPoolManager

Low-level session pool management (usually used via Manager).

```typescript
import { SessionPoolManager } from '@jhseong7/neo4j-toolkit';
import Neo4j from 'neo4j-driver';

const driver = Neo4j.driver(url, authToken);
const pool = new SessionPoolManager({
  neo4jDriver: driver,
  numberOfSessions: 10,
  idleTimeoutMs: 300000
});

const { session, done } = pool.getSession();
try {
  await session.run(query, params);
} finally {
  done();
}

// Cleanup
await pool.shutdown();
```

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Architecture Overview](./docs/01-architecture-overview.md)** - System design and component structure
- **[Design Philosophy](./docs/02-design-philosophy.md)** - Core principles and design decisions
- **[Query Builder Deep Dive](./docs/03-query-builder.md)** - Internal implementation details
- **[Session Pool Deep Dive](./docs/04-session-pool.md)** - Connection pooling internals
- **[Manager Integration](./docs/05-manager.md)** - High-level facade usage
- **[Usage Guide](./docs/06-usage-guide.md)** - 25+ practical examples
- **[API Reference](./docs/07-api-reference.md)** - Complete API documentation
- **[Advanced Patterns](./docs/08-advanced-patterns.md)** - Production best practices

### Quick Links

- 📚 [Full Documentation](./docs/README.md)
- 🚀 [Getting Started Guide](./docs/06-usage-guide.md)
- 📖 [API Reference](./docs/07-api-reference.md)
- 🎯 [Examples](./docs/06-usage-guide.md#examples)

## Performance

### Session Pooling Benefits

```
Session Creation:  ~50-100ms
Session Reuse:     ~0.1ms
Speedup:           500-1000x faster! 🚀
```

### Best Practices

1. **Use Session Pooling** - Always use `Neo4jManager` or `SessionPoolManager`
2. **Parameterize Queries** - Prevents injection attacks and improves performance
3. **Create Indexes** - For frequently queried properties
4. **Limit Results** - Always use `LIMIT` when you don't need all results
5. **Batch Operations** - Use transactions for multiple write operations
6. **Monitor Performance** - Use `EXPLAIN` and `PROFILE` to analyze queries

```typescript
// ✓ GOOD: Parameterized query
await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'p',
      labels: ['Person'],
      properties: { name }  // Parameterized
    }))
    .return('p');
});

// ✗ BAD: String interpolation (injection risk!)
await manager.runQuery(
  `MATCH (p:Person {name: "${name}"}) RETURN p`
);
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Development Setup

```bash
# Clone repository
git clone https://github.com/jhseong7/neo4j-toolkit.git
cd neo4j-toolkit

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- query-builder.spec.ts
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/jhseong7/neo4j-toolkit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jhseong7/neo4j-toolkit/discussions)

## Acknowledgments

Built with ❤️ by [jhseong7](https://github.com/jhseong7)

---

**Happy Querying! 🚀**
