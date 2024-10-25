# Session Pool Manager

This is a simple session pool manager designed to be used with the official Neo4j driver for NodeJS.

The manager automatically creates the designated number of sessions and manages the lifecycle of the sessions, so you don't have to worry about creating and closing the sessions.

# Usage

To use the session pool manager directly, you can create an instance of the manager and call the `getSession` method to get a session.

The `getSession` method returns an object with the session and a `done` function to close the session.

the done function should be called after you are done with the session. or else, the session will be depleted and the manager will throw an error when there are no more sessions available.

```typescript
const manager = new SessionPoolManager({
  neo4jDriver: driver,
});

const { session, done } = manager.getSession();

try {
  // Do something with the session
} finally {
  done();
}
```
