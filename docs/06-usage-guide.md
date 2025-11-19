# Usage Guide & Examples

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Queries](#basic-queries)
3. [Graph Pattern Matching](#graph-pattern-matching)
4. [Filtering with WHERE](#filtering-with-where)
5. [Creating and Updating Data](#creating-and-updating-data)
6. [Advanced Patterns](#advanced-patterns)
7. [Common Use Cases](#common-use-cases)
8. [Performance Tips](#performance-tips)

---

## Getting Started

### Installation

```bash
# NPM
npm install @jhseong7/neo4j-toolkit neo4j-driver

# Yarn
yarn add @jhseong7/neo4j-toolkit neo4j-driver
```

### Quick Start

```typescript
import { Neo4jManager } from '@jhseong7/neo4j-toolkit';
import Neo4j from 'neo4j-driver';

// Create manager instance
const manager = new Neo4jManager({
  driver: {
    url: 'neo4j://localhost:7687',
    authToken: Neo4j.auth.basic('neo4j', 'password')
  },
  pool: {
    numberOfSessions: 10
  }
});

// Execute a simple query
const result = await manager.runQuery(
  "MATCH (n:Person) RETURN n LIMIT 10"
);

console.log(result.records);
```

---

## Basic Queries

### Example 1: Find All Nodes

```typescript
// Using raw query
const result = await manager.runQuery(
  "MATCH (n:Person) RETURN n"
);

// Using query builder
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'n',
      labels: ['Person']
    }))
    .return('n');
});
```

### Example 2: Find Node by Property

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

// Usage
const result = await findPersonByName('Alice');
```

### Example 3: Return Multiple Properties

```typescript
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'p',
      labels: ['Person']
    }))
    .return(['p.name', 'p.age', 'p.city']);
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

### Example 4: Limit and Pagination

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

---

## Graph Pattern Matching

### Example 5: Simple Relationship

```typescript
// Find who knows whom
const result = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({ alias: 'person', labels: ['Person'] })
      .toRelationship({ alias: 'knows', label: 'KNOWS' })
      .toNode({ alias: 'friend', labels: ['Person'] })
    )
    .return(['person.name', 'friend.name']);
});
```

### Example 6: Bidirectional Relationship

```typescript
// Find friends (both directions)
const result = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({ alias: 'person', labels: ['Person'] })
      .toRelationship({ label: 'KNOWS' })
      .toNode({ alias: 'friend', labels: ['Person'] })
    )
    .return(['person.name', 'friend.name']);
});

// Undirected relationship
const result2 = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({ alias: 'a' })
      .addNode({ alias: 'b' })  // Undirected
    )
    .return(['a', 'b']);
});
```

### Example 7: Multi-Hop Relationships

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

### Example 8: Multiple Patterns

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

### Example 9: Optional Relationships

```typescript
// Find people and their friends (if any)
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'person',
      labels: ['Person']
    }))
    .optionalMatch(p => p
      .setNode({ alias: 'person' })  // Same person
      .toRelationship({ label: 'KNOWS' })
      .toNode({ alias: 'friend' })
    )
    .return(['person.name', 'friend.name']);
});

// friend.name will be null for people with no friends
```

### Example 10: Shortest Path

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

---

## Filtering with WHERE

### Example 11: Simple Conditions

```typescript
// Age filter
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
    .where(w => w.add('p.age > $minAge', { minAge: 25 }))
    .return('p');
});
```

### Example 12: AND Conditions

```typescript
// Multiple conditions
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

### Example 13: OR Conditions

```typescript
// People from multiple cities
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

### Example 14: Complex Nested Conditions

```typescript
// (age > 25 OR age < 18) AND (city = 'NYC' OR city = 'LA')
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
    .where(w => w
      .bracket(b => b
        .add('p.age > 25')
        .or('p.age < 18')
      )
      .and(w => w.bracket(b => b
        .add('p.city = "NYC"')
        .or('p.city = "LA"')
      ))
    )
    .return('p');
});
```

### Example 15: String Matching

```typescript
// Case-insensitive search
const result = await manager.runQuery(
  `MATCH (p:Person)
   WHERE toLower(p.name) CONTAINS toLower($searchTerm)
   RETURN p`,
  { searchTerm: 'john' }
);

// Regex matching
const result2 = await manager.runQuery(
  `MATCH (p:Person)
   WHERE p.email =~ $pattern
   RETURN p`,
  { pattern: '.*@example\\.com' }
);
```

---

## Creating and Updating Data

### Example 16: Create Single Node

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

### Example 17: Create with Relationships

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

### Example 18: MERGE (Create or Match)

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

### Example 19: Update Properties

```typescript
// Using raw query with SET
const result = await manager.runQuery(
  `MATCH (p:Person {name: $name})
   SET p.age = $newAge, p.updated = timestamp()
   RETURN p`,
  { name: 'Alice', newAge: 31 }
);
```

### Example 20: Batch Create

```typescript
async function batchCreatePeople(
  people: Array<{ name: string; age: number; city: string }>
) {
  const { session, done } = manager.getSession();

  try {
    // Use transaction for batch operations
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

---

## Advanced Patterns

### Example 21: Aggregations

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

### Example 22: Collect Results

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

### Example 23: CASE Expressions

```typescript
// Categorize by age
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

### Example 24: Subqueries with CALL

```typescript
// Find top 3 friends per person
const result = await manager.runQuery(
  `MATCH (p:Person)
   CALL {
     WITH p
     MATCH (p)-[:KNOWS]->(friend:Person)
     RETURN friend
     ORDER BY friend.name
     LIMIT 3
   }
   RETURN p.name, collect(friend.name) as top3Friends`
);
```

### Example 25: Path Analysis

```typescript
// Analyze relationship paths
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

---

## Common Use Cases

### Use Case 1: Social Network - Friend Recommendations

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
```

### Use Case 2: Recommendation Engine

```typescript
async function getProductRecommendations(userId: string, limit: number = 5) {
  return await manager.runQuery(
    `// Find products purchased by similar users
     MATCH (user:User {id: $userId})-[:PURCHASED]->(p:Product)
     MATCH (similar:User)-[:PURCHASED]->(p)
     WHERE user <> similar

     // Find products purchased by similar users
     MATCH (similar)-[:PURCHASED]->(recommendation:Product)
     WHERE NOT (user)-[:PURCHASED]->(recommendation)

     // Score by similarity
     WITH recommendation, count(DISTINCT similar) as score
     RETURN recommendation.name, score
     ORDER BY score DESC
     LIMIT $limit`,
    { userId, limit }
  );
}
```

### Use Case 3: Hierarchical Data - Organization Chart

```typescript
async function getOrgChart(employeeName: string) {
  return await manager.runQuery(
    `// Find employee and their reporting structure
     MATCH (emp:Employee {name: $employeeName})

     // Find manager chain
     OPTIONAL MATCH managerPath = (emp)-[:REPORTS_TO*]->(manager:Employee)

     // Find direct reports
     OPTIONAL MATCH (report:Employee)-[:REPORTS_TO]->(emp)

     RETURN emp,
            [m in nodes(managerPath) | m.name] as managers,
            collect(report.name) as directReports`,
    { employeeName }
  );
}
```

### Use Case 4: Knowledge Graph - Entity Relationships

```typescript
async function getEntityConnections(entityName: string, depth: number = 2) {
  return await manager.runQuery(
    `MATCH (entity:Entity {name: $entityName})
     CALL {
       WITH entity
       MATCH path = (entity)-[*1..$depth]-(related:Entity)
       RETURN related, relationships(path) as rels
       LIMIT 50
     }
     RETURN entity.name as source,
            related.name as target,
            [r in rels | type(r)] as relationshipTypes`,
    { entityName, depth }
  );
}
```

### Use Case 5: Access Control - Permission Checking

```typescript
async function checkUserPermission(
  userId: string,
  resourceId: string
): Promise<boolean> {
  const result = await manager.runQuery(
    `MATCH (user:User {id: $userId})
     MATCH (resource:Resource {id: $resourceId})

     // Check direct permission
     OPTIONAL MATCH (user)-[:HAS_PERMISSION]->(resource)

     // Check group permission
     OPTIONAL MATCH (user)-[:MEMBER_OF]->(group:Group)-[:HAS_PERMISSION]->(resource)

     // Check role permission
     OPTIONAL MATCH (user)-[:HAS_ROLE]->(role:Role)-[:HAS_PERMISSION]->(resource)

     RETURN count(*) > 0 as hasAccess`,
    { userId, resourceId }
  );

  return result.records[0]?.get('hasAccess') || false;
}
```

---

## Performance Tips

### Tip 1: Use Indexes

```typescript
// Create indexes for frequently queried properties
await manager.runQuery(
  "CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name)"
);

await manager.runQuery(
  "CREATE INDEX person_email IF NOT EXISTS FOR (p:Person) ON (p.email)"
);

// Composite index
await manager.runQuery(
  "CREATE INDEX person_city_age IF NOT EXISTS FOR (p:Person) ON (p.city, p.age)"
);
```

### Tip 2: Use Parameters

```typescript
// ✓ GOOD: Parameterized
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'p',
      labels: ['Person'],
      properties: { name }  // Parameter
    }))
    .return('p');
});

// ✗ BAD: String interpolation
const result = await manager.runQuery(
  `MATCH (p:Person {name: "${name}"}) RETURN p`  // Injection risk!
);
```

### Tip 3: Limit Results

```typescript
// Always limit when you don't need all results
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
    .return('p')
    .limit(100);  // Prevent massive result sets
});
```

### Tip 4: Use EXPLAIN/PROFILE

```typescript
// Analyze query performance
const result = await manager.runQuery(
  "EXPLAIN MATCH (p:Person)-[:KNOWS]->(f:Person) RETURN p, f"
);

const result2 = await manager.runQuery(
  "PROFILE MATCH (p:Person)-[:KNOWS]->(f:Person) RETURN p, f"
);
```

### Tip 5: Batch Operations in Transactions

```typescript
// Use transactions for consistency and performance
const { session, done } = manager.getSession();

try {
  await session.writeTransaction(async tx => {
    // All operations in one transaction
    for (const person of people) {
      await tx.run(createQuery, person);
    }
  });
} finally {
  done();
}
```

---

**Next:** [API Reference →](./07-api-reference.md)
