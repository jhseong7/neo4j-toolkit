import Neo4j, { Driver, Session } from "neo4j-driver";
import { v4 as uuid } from "uuid";
import { NoSessionException } from "./exception";

type SessionFromPool = {
  session: Session;
  done: () => void;
};

export class SessionPoolManager {
  private _neo4jDriver: Driver;
  private _numberOfSessions: number;

  private _idleSessionMap: Map<string, Session> = new Map();
  private _activeSessionMap: Map<string, Session> = new Map();

  constructor(params: { neo4jDriver: Driver; numberOfSessions: number }) {
    this._neo4jDriver = params.neo4jDriver;
    this._numberOfSessions = params.numberOfSessions;

    if (this._numberOfSessions <= 0) {
      throw new Error("numberOfSessions must be greater than 0");
    }

    this._initializeSessions();
  }

  // Create a new session pool manager
  private _initializeSessions() {
    // Create a new session pool
    for (let i = 0; i < this._numberOfSessions; i++) {
      const session = this._neo4jDriver.session();
      this._idleSessionMap.set(uuid(), session);
    }
  }

  /**
   * Shutdown all the sessions in the session pool. If the option is not provided, the driver will be closed too
   */
  public async shutdown(stopDriver = true) {
    const closeFunctions = Array.from(this._idleSessionMap.values()).map(
      (session) => session.close()
    );
    const results = await Promise.allSettled(closeFunctions);

    // If any of the sessions failed to close, throw an error
    const failedResults = results.filter(
      (result) => result.status === "rejected"
    );

    // For each failed result, log the reason
    if (failedResults.length > 0) {
      throw new Error(
        `Failed to close all sessions. ${
          failedResults.length
        } sessions failed to close. Reasons: ${failedResults
          .map((result) => result.reason)
          .join(", ")}`
      );
    }

    // If the driver should be closed, close the driver
    if (stopDriver) {
      await this._neo4jDriver.close();
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
  public getSession(): SessionFromPool {
    // If no idle sessions are available, return null
    if (this._idleSessionMap.size === 0) {
      throw new NoSessionException();
    }

    // Get a random session from the session pool
    const [id, session] = Array.from(this._idleSessionMap.entries())[
      Math.floor(Math.random() * this._idleSessionMap.size)
    ];

    try {
      // Remove the session from the idle session map
      this._idleSessionMap.delete(id);

      // Set the session in the active session map
      this._activeSessionMap.set(id, session);

      return {
        session,
        done: () => {
          // Remove the session from the active session map
          this._activeSessionMap.delete(id);

          // Add the session back to the idle session map
          this._idleSessionMap.set(id, session);
        },
      };
    } catch (error) {
      // Return the session to the idle session map if it fails before returning to the user
      this._idleSessionMap.set(id, session);
      throw error;
    }
  }
}
