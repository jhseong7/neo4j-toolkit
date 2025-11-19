# Advanced Patterns & Best Practices

## Table of Contents

1. [Design Patterns](#design-patterns)
2. [Error Handling Strategies](#error-handling-strategies)
3. [Performance Optimization](#performance-optimization)
4. [Testing Strategies](#testing-strategies)
5. [Production Deployment](#production-deployment)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Design Patterns

### Pattern 1: Repository Pattern

Encapsulate Neo4j access logic in repository classes.

```typescript
// person.repository.ts
export class PersonRepository {
  constructor(private manager: Neo4jManager) {}

  async findById(id: string): Promise<Person | null> {
    const result = await this.manager.runQuery(qb => {
      qb.match(p => p.setNode({
          alias: 'p',
          labels: ['Person'],
          properties: { id }
        }))
        .return('p');
    });

    if (result.records.length === 0) return null;

    return this.mapToPerson(result.records[0].get('p'));
  }

  async findAll(limit: number = 100): Promise<Person[]> {
    const result = await this.manager.runQuery(qb => {
      qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
        .return('p')
        .orderBy('p.name')
        .limit(limit);
    });

    return result.records.map(r => this.mapToPerson(r.get('p')));
  }

  async create(person: Omit<Person, 'id'>): Promise<Person> {
    const id = uuid();
    const result = await this.manager.runQuery(qb => {
      qb.create(p => p.setNode({
          alias: 'p',
          labels: ['Person'],
          properties: { ...person, id }
        }))
        .return('p');
    });

    return this.mapToPerson(result.records[0].get('p'));
  }

  async update(id: string, updates: Partial<Person>): Promise<Person> {
    const result = await this.manager.runQuery(
      `MATCH (p:Person {id: $id})
       SET p += $updates
       RETURN p`,
      { id, updates }
    );

    if (result.records.length === 0) {
      throw new Error(`Person ${id} not found`);
    }

    return this.mapToPerson(result.records[0].get('p'));
  }

  async delete(id: string): Promise<void> {
    await this.manager.runQuery(
      "MATCH (p:Person {id: $id}) DETACH DELETE p",
      { id }
    );
  }

  private mapToPerson(node: any): Person {
    return {
      id: node.properties.id,
      name: node.properties.name,
      age: node.properties.age,
      city: node.properties.city
    };
  }
}
```

**Benefits:**
- Encapsulation of data access logic
- Easier to test
- Centralized mapping logic
- Type safety

---

### Pattern 2: Service Layer

Separate business logic from data access.

```typescript
// person.service.ts
export class PersonService {
  constructor(
    private personRepo: PersonRepository,
    private friendshipRepo: FriendshipRepository
  ) {}

  async getFriendRecommendations(
    personId: string,
    limit: number = 10
  ): Promise<Person[]> {
    // Business logic here
    const person = await this.personRepo.findById(personId);
    if (!person) {
      throw new Error('Person not found');
    }

    // Query for recommendations
    const result = await this.manager.runQuery(
      `MATCH (person:Person {id: $personId})-[:KNOWS]->(:Person)-[:KNOWS]->(foaf:Person)
       WHERE NOT (person)-[:KNOWS]->(foaf) AND person <> foaf
       WITH foaf, count(*) as commonFriends
       RETURN foaf
       ORDER BY commonFriends DESC
       LIMIT $limit`,
      { personId, limit }
    );

    return result.records.map(r =>
      this.personRepo.mapToPerson(r.get('foaf'))
    );
  }

  async createFriendship(
    person1Id: string,
    person2Id: string
  ): Promise<void> {
    // Validate persons exist
    const [person1, person2] = await Promise.all([
      this.personRepo.findById(person1Id),
      this.personRepo.findById(person2Id)
    ]);

    if (!person1 || !person2) {
      throw new Error('One or both persons not found');
    }

    // Business rule: prevent self-friendship
    if (person1Id === person2Id) {
      throw new Error('Cannot create friendship with self');
    }

    // Create bidirectional friendship
    await this.friendshipRepo.create(person1Id, person2Id);
  }
}
```

---

### Pattern 3: Unit of Work

Manage transactions across multiple operations.

```typescript
export class UnitOfWork {
  private session: Session;
  private done: () => void;
  private transaction: Transaction | null = null;

  constructor(private manager: Neo4jManager) {}

  async begin() {
    const { session, done } = this.manager.getSession();
    this.session = session;
    this.done = done;
    this.transaction = session.beginTransaction();
  }

  async commit() {
    if (!this.transaction) {
      throw new Error('Transaction not started');
    }

    await this.transaction.commit();
    this.done();
  }

  async rollback() {
    if (!this.transaction) {
      throw new Error('Transaction not started');
    }

    await this.transaction.rollback();
    this.done();
  }

  async run(query: string, params: any) {
    if (!this.transaction) {
      throw new Error('Transaction not started');
    }

    return await this.transaction.run(query, params);
  }
}

// Usage
async function transferOwnership(
  itemId: string,
  fromUserId: string,
  toUserId: string
) {
  const uow = new UnitOfWork(manager);

  try {
    await uow.begin();

    // Remove from old owner
    await uow.run(
      "MATCH (u:User {id: $fromUserId})-[r:OWNS]->(i:Item {id: $itemId}) DELETE r",
      { fromUserId, itemId }
    );

    // Add to new owner
    await uow.run(
      "MATCH (u:User {id: $toUserId}), (i:Item {id: $itemId}) CREATE (u)-[:OWNS]->(i)",
      { toUserId, itemId }
    );

    await uow.commit();
  } catch (error) {
    await uow.rollback();
    throw error;
  }
}
```

---

### Pattern 4: Query Object Pattern

Encapsulate complex queries as reusable objects.

```typescript
export class PersonQueries {
  static findByAgeRange(minAge: number, maxAge: number) {
    return (qb: QueryBuilder) => {
      qb.match(p => p.setNode({ alias: 'p', labels: ['Person'] }))
        .where(w => w
          .add('p.age >= $minAge', { minAge })
          .and('p.age <= $maxAge', { maxAge })
        )
        .return('p')
        .orderBy('p.age');
    };
  }

  static findWithFriends() {
    return (qb: QueryBuilder) => {
      qb.match(p => p
          .setNode({ alias: 'person', labels: ['Person'] })
          .toRelationship({ alias: 'knows', label: 'KNOWS' })
          .toNode({ alias: 'friend', labels: ['Person'] })
        )
        .return(['person', 'collect(friend) as friends'])
        .orderBy('person.name');
    };
  }

  static friendOfFriend(personId: string) {
    return (qb: QueryBuilder) => {
      qb.match(p => p
          .setNode({
            alias: 'person',
            labels: ['Person'],
            properties: { id: personId }
          })
          .toRelationship({ label: 'KNOWS' })
          .toNode({ alias: 'friend', labels: ['Person'] })
          .toRelationship({ label: 'KNOWS' })
          .toNode({ alias: 'foaf', labels: ['Person'] })
        )
        .where(w => w.add('person <> foaf'))
        .return('foaf');
    };
  }
}

// Usage
const result = await manager.runQuery(
  PersonQueries.findByAgeRange(25, 65)
);

const result2 = await manager.runQuery(
  PersonQueries.findWithFriends()
);

const result3 = await manager.runQuery(
  PersonQueries.friendOfFriend(userId)
);
```

---

## Error Handling Strategies

### Strategy 1: Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    retryOn?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    retryOn = (error) => error instanceof NoSessionException
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if not retryable
      if (!retryOn(error)) {
        throw error;
      }

      // Last attempt - throw
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(
  () => manager.runQuery(query, params),
  {
    maxRetries: 5,
    initialDelay: 100,
    maxDelay: 5000,
    retryOn: (error) =>
      error instanceof NoSessionException ||
      error.message.includes('TransientError')
  }
);
```

---

### Strategy 2: Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,  // 1 minute
    private resetTimeout: number = 30000  // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      // Success - reset
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
      }
      this.failures = 0;

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState() {
    return this.state;
  }
}

// Usage
const breaker = new CircuitBreaker();

async function queryWithCircuitBreaker(query: string, params: any) {
  return await breaker.execute(() =>
    manager.runQuery(query, params)
  );
}
```

---

### Strategy 3: Error Context Enrichment

```typescript
class QueryError extends Error {
  constructor(
    message: string,
    public query: string,
    public parameters: any,
    public originalError: Error
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

async function executeQueryWithContext(
  query: string,
  params: any
): Promise<QueryResult> {
  try {
    return await manager.runQuery(query, params);
  } catch (error) {
    throw new QueryError(
      `Query execution failed: ${error.message}`,
      query,
      params,
      error
    );
  }
}

// Usage with logging
try {
  const result = await executeQueryWithContext(query, params);
} catch (error) {
  if (error instanceof QueryError) {
    logger.error('Query failed', {
      query: error.query,
      params: error.parameters,
      originalError: error.originalError,
      stack: error.stack
    });
  }
  throw error;
}
```

---

## Performance Optimization

### Optimization 1: Connection Pooling Tuning

```typescript
// For high-concurrency API servers
const manager = new Neo4jManager({
  driver: {
    url: process.env.NEO4J_URL,
    authToken: Neo4j.auth.basic(
      process.env.NEO4J_USER,
      process.env.NEO4J_PASSWORD
    ),
    config: {
      maxConnectionLifetime: 3600000,  // 1 hour
      maxConnectionPoolSize: 100,      // Large pool for driver
      connectionAcquisitionTimeout: 60000,
      encrypted: true
    }
  },
  pool: {
    numberOfSessions: 50,               // Large session pool
    idleTimeoutMs: 300000              // 5 minutes
  }
});

// For background jobs
const managerForJobs = new Neo4jManager({
  driver: { /* same */ },
  pool: {
    numberOfSessions: 5,                // Small pool
    idleTimeoutMs: 60000               // 1 minute (shorter)
  }
});
```

---

### Optimization 2: Batch Processing

```typescript
async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

// Usage
async function createManyPeople(people: Person[]) {
  return await batchProcess(
    people,
    async (batch) => {
      const { session, done } = manager.getSession();

      try {
        return await session.writeTransaction(async tx => {
          const results = [];
          for (const person of batch) {
            const result = await tx.run(
              "CREATE (p:Person $props) RETURN p",
              { props: person }
            );
            results.push(result.records[0].get('p'));
          }
          return results;
        });
      } finally {
        done();
      }
    },
    100  // Batch size
  );
}
```

---

### Optimization 3: Query Result Streaming

```typescript
async function* streamResults(
  query: string,
  params: any
): AsyncGenerator<any, void, unknown> {
  const { session, done } = manager.getSession();

  try {
    const result = await session.run(query, params);

    for (const record of result.records) {
      yield record;
    }
  } finally {
    done();
  }
}

// Usage
async function processLargeDataset() {
  const query = "MATCH (p:Person) RETURN p";

  for await (const record of streamResults(query, {})) {
    // Process one record at a time
    await processRecord(record);
  }
}
```

---

### Optimization 4: Caching Strategy

```typescript
class CachedQueryService {
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    private manager: Neo4jManager,
    private defaultTTL: number = 60000  // 1 minute
  ) {}

  private getCacheKey(query: string, params: any): string {
    return `${query}:${JSON.stringify(params)}`;
  }

  async query(
    query: string,
    params: any,
    ttl: number = this.defaultTTL
  ): Promise<QueryResult> {
    const key = this.getCacheKey(query, params);
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    const result = await this.manager.runQuery(query, params);

    this.cache.set(key, {
      data: result,
      expiry: Date.now() + ttl
    });

    return result;
  }

  invalidate(query: string, params: any) {
    const key = this.getCacheKey(query, params);
    this.cache.delete(key);
  }

  clearAll() {
    this.cache.clear();
  }
}
```

---

## Testing Strategies

### Strategy 1: Repository Testing with Mocks

```typescript
// person.repository.spec.ts
describe('PersonRepository', () => {
  let repository: PersonRepository;
  let mockManager: jest.Mocked<Neo4jManager>;

  beforeEach(() => {
    mockManager = {
      runQuery: jest.fn()
    } as any;

    repository = new PersonRepository(mockManager);
  });

  it('should find person by id', async () => {
    const mockResult = {
      records: [{
        get: (key: string) => ({
          properties: {
            id: '123',
            name: 'Alice',
            age: 30
          }
        })
      }]
    };

    mockManager.runQuery.mockResolvedValue(mockResult as any);

    const person = await repository.findById('123');

    expect(person).toEqual({
      id: '123',
      name: 'Alice',
      age: 30
    });
  });
});
```

---

### Strategy 2: Integration Testing

```typescript
// integration.spec.ts
describe('Person Integration Tests', () => {
  let manager: Neo4jManager;

  beforeAll(() => {
    manager = new Neo4jManager({
      driver: {
        url: 'neo4j://localhost:7687',
        authToken: Neo4j.auth.basic('neo4j', 'test')
      },
      pool: { numberOfSessions: 5 }
    });
  });

  afterAll(async () => {
    await manager._sessionPool.shutdown();
  });

  beforeEach(async () => {
    // Clean database
    await manager.runQuery("MATCH (n) DETACH DELETE n");
  });

  it('should create and find person', async () => {
    // Create
    await manager.runQuery(qb => {
      qb.create(p => p.setNode({
          alias: 'p',
          labels: ['Person'],
          properties: { name: 'Alice', age: 30 }
        }))
        .finish();
    });

    // Find
    const result = await manager.runQuery(qb => {
      qb.match(p => p.setNode({
          alias: 'p',
          labels: ['Person'],
          properties: { name: 'Alice' }
        }))
        .return('p');
    });

    expect(result.records.length).toBe(1);
    expect(result.records[0].get('p').properties.age).toBe(30);
  });
});
```

---

## Production Deployment

### Deployment Checklist

```
Production Readiness Checklist:
════════════════════════════════════════════════════════════════

□ Environment Configuration
  □ Use environment variables for credentials
  □ Configure connection pooling appropriately
  □ Set up proper timeout values
  □ Enable TLS encryption

□ Monitoring & Logging
  □ Log all query errors with context
  □ Monitor session pool metrics
  □ Track query performance
  □ Set up alerts for NoSessionException

□ Error Handling
  □ Implement retry logic
  □ Add circuit breakers for critical paths
  □ Graceful degradation strategies

□ Performance
  □ Create necessary indexes
  □ Optimize frequently-run queries
  □ Implement caching where appropriate
  □ Use batching for bulk operations

□ Security
  □ Use parameterized queries (prevent injection)
  □ Implement proper authentication
  □ Use least-privilege database users
  □ Audit sensitive queries

□ Testing
  □ Unit tests for repositories
  □ Integration tests with test database
  □ Load testing
  □ Chaos testing (handle node failures)
```

---

### Configuration Management

```typescript
// config.ts
export const neo4jConfig = {
  development: {
    driver: {
      url: process.env.NEO4J_URL || 'neo4j://localhost:7687',
      authToken: Neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      ),
      config: {
        maxConnectionLifetime: 3600000,
        maxConnectionPoolSize: 50
      }
    },
    pool: {
      numberOfSessions: 10,
      idleTimeoutMs: 300000
    }
  },

  production: {
    driver: {
      url: process.env.NEO4J_URL!,
      authToken: Neo4j.auth.basic(
        process.env.NEO4J_USER!,
        process.env.NEO4J_PASSWORD!
      ),
      config: {
        maxConnectionLifetime: 3600000,
        maxConnectionPoolSize: 100,
        encrypted: true,
        trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES'
      }
    },
    pool: {
      numberOfSessions: 50,
      idleTimeoutMs: 300000
    }
  }
};

const env = process.env.NODE_ENV || 'development';
export const manager = new Neo4jManager(neo4jConfig[env]);
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: ❌ Not Using try-finally

```typescript
// ❌ BAD
const { session, done } = manager.getSession();
const result = await session.run(query);  // May throw
done();  // Never called if error occurs!

// ✅ GOOD
const { session, done } = manager.getSession();
try {
  const result = await session.run(query);
  return result;
} finally {
  done();  // Always called
}
```

---

### Anti-Pattern 2: ❌ String Concatenation

```typescript
// ❌ BAD - SQL injection risk!
const query = `MATCH (p:Person {name: "${name}"}) RETURN p`;
await manager.runQuery(query);

// ✅ GOOD - Parameterized
await manager.runQuery(qb => {
  qb.match(p => p.setNode({
      alias: 'p',
      labels: ['Person'],
      properties: { name }
    }))
    .return('p');
});
```

---

### Anti-Pattern 3: ❌ N+1 Query Problem

```typescript
// ❌ BAD
const people = await getAllPeople();
for (const person of people) {
  const friends = await getFriends(person.id);  // N queries!
  person.friends = friends;
}

// ✅ GOOD
const result = await manager.runQuery(
  `MATCH (p:Person)
   OPTIONAL MATCH (p)-[:KNOWS]->(friend:Person)
   RETURN p, collect(friend) as friends`
);
```

---

### Anti-Pattern 4: ❌ Not Limiting Results

```typescript
// ❌ BAD - May return millions of records!
const result = await manager.runQuery(
  "MATCH (n) RETURN n"
);

// ✅ GOOD
const result = await manager.runQuery(qb => {
  qb.match(p => p.setNode({ alias: 'n' }))
    .return('n')
    .limit(1000);  // Always limit!
});
```

---

### Anti-Pattern 5: ❌ Ignoring Errors

```typescript
// ❌ BAD
try {
  await manager.runQuery(query);
} catch (error) {
  console.log('Error:', error);  // Just log and continue?
}

// ✅ GOOD
try {
  await manager.runQuery(query);
} catch (error) {
  logger.error('Query failed', { query, error });

  if (error instanceof NoSessionException) {
    // Retry or queue
    await retryWithBackoff(() => manager.runQuery(query));
  } else {
    // Re-throw or handle appropriately
    throw error;
  }
}
```

---

## Summary

**Key Takeaways:**

1. **Use design patterns** - Repository, Service Layer, Unit of Work
2. **Handle errors properly** - Retry, circuit breakers, context enrichment
3. **Optimize performance** - Pooling, batching, caching, streaming
4. **Test thoroughly** - Unit tests, integration tests, load tests
5. **Deploy safely** - Configuration, monitoring, security
6. **Avoid anti-patterns** - Always use try-finally, parameterize, limit results

---

**Documentation Index:** [README →](./README.md)
