# neo4j-toolkit Documentation

Welcome to the comprehensive documentation for **neo4j-toolkit** - a TypeScript library providing a fluent, type-safe interface for building and executing Neo4j Cypher queries.

## Quick Links

- [GitHub Repository](https://github.com/jhseong7/neo4j-toolkit)
- [NPM Package](https://www.npmjs.com/package/@jhseong7/neo4j-toolkit)

---

## Documentation Structure

This documentation is organized into 8 comprehensive guides, progressing from high-level concepts to practical implementation details.

### 📐 Architecture & Design

#### [01. Architecture Overview](./01-architecture-overview.md)
Understand the high-level architecture, module structure, and how components work together.

**Topics Covered:**
- High-level architecture diagram
- Module structure and organization
- Layer architecture
- Data flow through the system
- Component relationships
- Design patterns summary

**Perfect for:** Architects, senior developers, and anyone wanting to understand the big picture.

```
┌────────────────────────────────────────┐
│         User Application               │
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

---

#### [02. Design Philosophy & Principles](./02-design-philosophy.md)
Learn the core philosophy and design principles that guide the library.

**Topics Covered:**
- The three pillars: Type Safety, Developer Experience, Performance
- Design principles (Builder Pattern, Separation of Concerns, Fail-Fast)
- Type system philosophy
- Error handling philosophy
- Performance philosophy
- API design philosophy

**Perfect for:** Understanding the "why" behind design decisions, contributors, and library designers.

**Key Quote:**
> "Build complex queries from simple, composable parts. Fail fast during construction, not during execution. Make the right way the easy way."

---

### 🔧 Deep Dives

#### [03. Query Builder Deep Dive](./03-query-builder.md)
Comprehensive guide to the query builder module - the heart of the library.

**Topics Covered:**
- Core architecture and internal state
- PathPatternBuilder (graph pattern construction)
- Clause builders (WHERE, RETURN, ORDER BY, etc.)
- Component builders (Node, Relationship)
- Query assembly process
- Alias tracking system
- Advanced features (shortest path, multiple patterns)

**Perfect for:** Developers building complex queries, understanding parameterization and validation.

**Highlights:**
- 🎯 Fluent API for intuitive query building
- 🔒 Type-safe construction with compile-time checks
- 🛡️ Automatic parameterization prevents injection
- ✅ Build-time alias validation
- 🌳 Tree structures for complex WHERE conditions

---

#### [04. Session Pool Deep Dive](./04-session-pool.md)
Everything about connection management and session pooling.

**Topics Covered:**
- Why session pooling? (500-1000x performance improvement!)
- Architecture and internal state
- Session lifecycle
- Proxy pattern implementation
- Idle timeout management
- Error handling
- Performance characteristics

**Perfect for:** Performance optimization, understanding resource management.

**Key Metrics:**
```
Session Creation:  ~50-100ms
Session Reuse:     ~0.1ms
Speedup:           500-1000x faster! 🚀
```

---

#### [05. Manager Integration](./05-manager.md)
High-level facade that combines driver, pool, and query builder.

**Topics Covered:**
- Manager architecture
- Configuration options
- API methods (runQuery, getSession)
- Process lifecycle management
- Signal handling (graceful shutdown)
- Usage examples
- Best practices

**Perfect for:** Getting started quickly, application-level integration.

**When to Use:**
- ✅ Most applications
- ✅ Quick prototyping
- ✅ Standard use cases
- ✅ Want automatic cleanup

---

### 📚 Practical Guides

#### [06. Usage Guide & Examples](./06-usage-guide.md)
Practical guide with 25+ real-world examples.

**Topics Covered:**
- Getting started (installation, quick start)
- Basic queries (MATCH, WHERE, RETURN)
- Graph pattern matching (relationships, paths)
- Filtering with WHERE (simple, AND/OR, nested)
- Creating and updating data
- Advanced patterns (aggregations, subqueries)
- Common use cases (social network, recommendations, etc.)
- Performance tips

**Perfect for:** Learning by example, quick reference, solving specific problems.

**25+ Examples Including:**
- 🔍 Finding nodes and relationships
- 🌐 Multi-hop graph traversals
- 🎯 Complex filtering conditions
- ✏️ Creating and updating data
- 📊 Aggregations and analytics
- 🤝 Social network patterns
- 🎁 Recommendation engines
- 🏢 Hierarchical data
- 🔐 Access control

---

#### [07. API Reference](./07-api-reference.md)
Complete API documentation for all classes, methods, and types.

**Topics Covered:**
- Core classes (QueryBuilder, PathPatternBuilder, etc.)
- Type definitions (Neo4jPrimitive, ParameterizedQuery, etc.)
- Exceptions (QueryBuilderException, NoSessionException)
- Utility functions

**Perfect for:** Detailed method signatures, type definitions, comprehensive reference.

**Structure:**
```
QueryBuilder
  ├─ Static Methods: new()
  ├─ Selective Clauses: match, create, merge
  ├─ Filtering: where, addWhere
  ├─ Projection: return, addReturn
  ├─ Sorting: orderBy, addOrderBy
  ├─ Pagination: skip, limit, offset
  └─ Output: toParameterizedQuery, toRawQuery
```

---

#### [08. Advanced Patterns & Best Practices](./08-advanced-patterns.md)
Production-ready patterns, optimization strategies, and anti-patterns to avoid.

**Topics Covered:**
- Design patterns (Repository, Service Layer, Unit of Work)
- Error handling strategies (Retry, Circuit Breaker)
- Performance optimization (Connection pooling, Batching, Caching)
- Testing strategies (Unit tests, Integration tests)
- Production deployment checklist
- Anti-patterns to avoid

**Perfect for:** Production deployments, performance optimization, testing strategies.

**Includes:**
- 📦 Repository Pattern implementation
- 🔄 Retry with exponential backoff
- 🔌 Circuit breaker pattern
- ⚡ Performance optimization techniques
- 🧪 Testing strategies
- ✅ Production deployment checklist
- ❌ Anti-patterns to avoid

---

## Quick Start

### Installation

```bash
npm install @jhseong7/neo4j-toolkit neo4j-driver
# or
yarn add @jhseong7/neo4j-toolkit neo4j-driver
```

### Basic Example

```typescript
import { Neo4jManager } from '@jhseong7/neo4j-toolkit';
import Neo4j from 'neo4j-driver';

// Create manager
const manager = new Neo4jManager({
  driver: {
    url: 'neo4j://localhost:7687',
    authToken: Neo4j.auth.basic('neo4j', 'password')
  },
  pool: {
    numberOfSessions: 10
  }
});

// Execute query with query builder
const result = await manager.runQuery(qb => {
  qb.match(p => p
      .setNode({ alias: 'person', labels: ['Person'] })
      .toRelationship({ label: 'KNOWS' })
      .toNode({ alias: 'friend', labels: ['Person'] })
    )
    .where(w => w.add('person.age > 25'))
    .return(['person.name', 'friend.name'])
    .limit(10);
});

console.log(result.records);
```

---

## Documentation Roadmap

### Learning Path

Recommended reading order based on your needs:

#### For Beginners:
1. [Architecture Overview](./01-architecture-overview.md) - Understand the big picture
2. [Usage Guide](./06-usage-guide.md) - Learn through examples
3. [Manager Integration](./05-manager.md) - Get started with the high-level API
4. [API Reference](./07-api-reference.md) - Reference as needed

#### For Intermediate Users:
1. [Design Philosophy](./02-design-philosophy.md) - Understand design decisions
2. [Query Builder Deep Dive](./03-query-builder.md) - Master query building
3. [Session Pool Deep Dive](./04-session-pool.md) - Optimize performance
4. [Advanced Patterns](./08-advanced-patterns.md) - Production best practices

#### For Advanced Users & Contributors:
1. [Architecture Overview](./01-architecture-overview.md) - System design
2. [Design Philosophy](./02-design-philosophy.md) - Design principles
3. [Query Builder Deep Dive](./03-query-builder.md) - Internal implementation
4. [Session Pool Deep Dive](./04-session-pool.md) - Resource management
5. [Advanced Patterns](./08-advanced-patterns.md) - Patterns and testing

---

## Visual Guide

### Architecture at a Glance

```
Application Code
      ↓
Neo4jManager ────────────────────┐
      ↓                          │
   ┌──────────────┐               │
   ↓              ↓               ↓
QueryBuilder  SessionPoolManager  Neo4j Driver
   ↓              ↓               │
Path/Clause    Session Pool       │
 Builders         ↓               │
   ↓              └───────────────┘
   ↓                      ↓
   └─────→ Cypher Query ─→ Neo4j Database
```

### Module Dependencies

```
manager ──────→ query-builder
   ↓               ↓
   ↓            types
   ↓
session-pool ──→ util
   ↓
neo4j-driver
```

---

## Key Features Overview

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **Fluent Query Builder** | Type-safe, chainable API for building Cypher queries | [Query Builder](./03-query-builder.md) |
| **Session Pooling** | 500-1000x performance improvement through connection reuse | [Session Pool](./04-session-pool.md) |
| **Auto Parameterization** | Prevents SQL injection with automatic parameter handling | [Query Builder](./03-query-builder.md) |
| **Alias Validation** | Build-time validation of aliases prevents runtime errors | [Query Builder](./03-query-builder.md) |
| **Type Safety** | Full TypeScript support with comprehensive type definitions | [Design Philosophy](./02-design-philosophy.md) |
| **Graceful Shutdown** | Automatic cleanup on process signals | [Manager](./05-manager.md) |
| **Proxy Safety** | Prevents use-after-return bugs with session proxies | [Session Pool](./04-session-pool.md) |

---

## Common Questions

### How do I...?

- **Build a simple query?** → [Usage Guide - Basic Queries](./06-usage-guide.md#basic-queries)
- **Match graph patterns?** → [Usage Guide - Graph Patterns](./06-usage-guide.md#graph-pattern-matching)
- **Use WHERE conditions?** → [Usage Guide - Filtering](./06-usage-guide.md#filtering-with-where)
- **Optimize performance?** → [Advanced Patterns - Performance](./08-advanced-patterns.md#performance-optimization)
- **Handle errors?** → [Advanced Patterns - Error Handling](./08-advanced-patterns.md#error-handling-strategies)
- **Test my code?** → [Advanced Patterns - Testing](./08-advanced-patterns.md#testing-strategies)
- **Deploy to production?** → [Advanced Patterns - Deployment](./08-advanced-patterns.md#production-deployment)

---

## Contributing

We welcome contributions! Before contributing, please read:

1. [Architecture Overview](./01-architecture-overview.md) - Understand the system
2. [Design Philosophy](./02-design-philosophy.md) - Follow design principles
3. [Advanced Patterns](./08-advanced-patterns.md) - Testing and best practices

---

## Support

- **Issues**: [GitHub Issues](https://github.com/jhseong7/neo4j-toolkit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jhseong7/neo4j-toolkit/discussions)
- **Email**: [author contact]

---

## Version

This documentation is for **neo4j-toolkit v0.0.2** (pre-alpha).

**Note:** This library is in pre-alpha stage. APIs may change. Use with caution in production.

---

## License

MIT License - see LICENSE file for details

---

**Happy Querying! 🚀**

Made with ❤️ by [jhseong7](https://github.com/jhseong7)
