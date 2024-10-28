import Neo4j, {
  AuthToken,
  AuthTokenManager,
  Config,
  QueryResult,
  RecordShape,
  Result,
} from "neo4j-driver";
import {
  SessionPoolConstructorParams,
  SessionPoolManager,
} from "../session-pool";
import { Neo4jProperties } from "../types";
import { QueryBuilder } from "../query-builder";

type ManagerContructorParams = {
  driver: {
    url: string;
    authToken?: AuthToken | AuthTokenManager;
    config?: Config;
  };
  pool: Omit<SessionPoolConstructorParams, "neo4jDriver">;
};

type QueryBuilderFunction = (q: QueryBuilder) => unknown;

export class Neo4jManager {
  private _sessionPool: SessionPoolManager;

  constructor(params: ManagerContructorParams) {
    const { pool, driver } = params;
    const { url, authToken, config } = driver;
    const neo4jDriver = Neo4j.driver(url, authToken, config);

    this._sessionPool = new SessionPoolManager({
      ...pool,
      neo4jDriver,
    });

    // bind the shutdown function to the process event
    process.on("SIGINT", () => this.onShutdown("SIGINT"));
    process.on("SIGTERM", () => this.onShutdown("SIGTERM"));
    process.on("SIGHUP", () => this.onShutdown("SIGHUP"));
  }

  // Shutdown the driver and the session pool
  private async onShutdown(signalType: "SIGINT" | "SIGTERM" | "SIGHUP") {
    console.log("Shutting down the Neo4j driver and the session pool");
    await this._sessionPool.shutdown();

    // exit the process depending on the signal type
    switch (signalType) {
      case "SIGINT":
        process.exit(130);
        break;
      case "SIGTERM":
        process.exit(143);
        break;
      case "SIGHUP":
        process.exit(129);
        break;
    }
  }

  /**
   * Get a session from the session pool. Returns a session and a done function to return the session to the pool
   * The done function must be called after the session is no longer needed or else, the session will be lost
   *
   * If no idle sessions are available, it will throw a NoSessionException. handle this case in the calling function
   *
   * ---
   *
   * Example usage:
   * ```typescript
   * const sessionFromPool = sessionPoolManager.getSession();
   * if(!sessionFromPool) {
   *  // Handle the case where no idle sessions are available
   * }
   *
   * const { session, done } = sessionFromPool;
   *
   * // Use the session
   *
   * // Return the session to the pool
   * done();
   * ```
   *
   * @returns {SessionFromPool}
   */
  public getSession() {
    return this._sessionPool.getSession();
  }

  /**
   * Run a query on the Neo4j database with the given query and parameters
   * @param query
   * @param params
   */
  public async runQuery(
    query: string,
    params?: Neo4jProperties
  ): Promise<QueryResult<RecordShape>>;

  /**
   * Run a query on the Neo4j database with the given query builder function
   * @param builder
   */
  public async runQuery(
    builder: QueryBuilderFunction
  ): Promise<QueryResult<RecordShape>>;

  public async runQuery(
    arg1: string | QueryBuilderFunction,
    arg2?: Neo4jProperties
  ): Promise<QueryResult<RecordShape>> {
    const sessionFromPool = this._sessionPool.getSession();
    if (!sessionFromPool) {
      throw new Error("No idle sessions available");
    }

    const { session, done } = sessionFromPool;
    try {
      let query: string;
      let params: Neo4jProperties;

      // Case 1: direct query
      if (typeof arg1 === "string") {
        query = arg1;
        params = arg2 ?? {};
      } else {
        const builder = new QueryBuilder();
        arg1(builder);

        const result = builder.toParameterizedQuery();
        query = result.query;
        params = result.parameters;
      }

      const result = await session.run(query, params);

      return result;
    } catch (error) {
      throw error;
    } finally {
      done();
    }
  }
}
