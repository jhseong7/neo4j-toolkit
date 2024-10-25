import Neo4j, { Driver, Session } from "neo4j-driver";
import { v4 as uuid } from "uuid";
import { NoSessionException } from "./exception";
import { OneshotTimer } from "../util/timeout";

type SessionFromPool = {
  session: Session;
  done: () => void;
};

type SessionPoolConstructorParams = {
  neo4jDriver: Driver;

  numberOfSessions?: number;
  idleTimeoutMs?: number;
  // connectionTimeoutMs?: number;
};

const DEFAULT_NUM_OF_SESSIONS = 10;

/**
 * Proxy to block the method call if the proxy is disabled
 * @param params
 * @returns
 */
function proxyWithException<T extends object>(params: {
  target: T;
  callback?: () => void;
  blockStatus: () => boolean;
  exceptionMessage?: string;
}): T {
  const { target, callback, blockStatus, exceptionMessage } = params;
  const proxy = new Proxy(target, {
    get(target: any, prop: string | symbol) {
      const originalMethod = target[prop];

      // Check if the property is a function
      if (typeof originalMethod === "function") {
        return function (...args: any[]) {
          // Call the callback function before calling the original method
          callback?.();

          // Check if the proxy is disabled --> if disabled, throw an error
          if (blockStatus()) {
            throw new Error(exceptionMessage);
          }

          return originalMethod.apply(target, args);
        };
      }

      return originalMethod;
    },
  });

  return proxy;
}

export class SessionPoolManager {
  private _neo4jDriver: Driver;

  private _numOfSessions: number;
  private _idleTimeoutMs?: number;
  // private _connectionTimeoutMs?: number;

  private _idleSessionMap: Map<string, Session> = new Map();
  private _activeSessionMap: Map<string, Session> = new Map();

  constructor(params: SessionPoolConstructorParams) {
    const {
      neo4jDriver,
      numberOfSessions = DEFAULT_NUM_OF_SESSIONS,
      idleTimeoutMs,
      // connectionTimeoutMs,
    } = params;
    this._neo4jDriver = neo4jDriver;

    this._numOfSessions = numberOfSessions;
    this._idleTimeoutMs = idleTimeoutMs;
    // this._connectionTimeoutMs = connectionTimeoutMs;

    if (this._numOfSessions <= 0) {
      throw new Error("maxSession must be greater than 0");
    }

    if (idleTimeoutMs && idleTimeoutMs <= 0) {
      throw new Error("idleTimeoutMs must be greater than 0");
    }

    // if (connectionTimeoutMs && connectionTimeoutMs <= 0) {
    //   throw new Error("connectionTimeoutMs must be greater than 0");
    // }

    this._initializeSessions();
  }

  // Create a new session pool manager
  private _initializeSessions() {
    // Create a new session pool (start with the min sessions)
    for (let i = 0; i < this._numOfSessions; i++) {
      const session = this._neo4jDriver.session();
      this._idleSessionMap.set(uuid(), session);
    }
  }

  private _increaseIdleSession() {
    const session = this._neo4jDriver.session();
    const id = uuid();

    this._idleSessionMap.set(id, session);

    // Set a timeout to remove the session from the idle session map
    setTimeout(() => {
      this._idleSessionMap.delete(id);
      session.close();
    }, this._idleTimeoutMs);
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

      // Done function to return the session to the pool
      const idleTimeout = new OneshotTimer();
      const done = () => {
        // If the session is already in the idle session map, do not add it again
        if (this._idleSessionMap.has(id)) {
          return false;
        }

        // Remove the session from the active session map
        this._activeSessionMap.delete(id);

        // Add the session back to the idle session map
        this._idleSessionMap.set(id, session);

        // Include the stop function to stop the idle timeout
        idleTimeout.stop();

        return true;
      };

      // Add a proxy to the session to track the idle timeout
      // Setup the idle timeout only if the idle timeout is set
      let proxyCallback: () => void;
      if (this._idleTimeoutMs) {
        // Set the timeout callback to the session done function
        idleTimeout.setCallback(() => done());
        idleTimeout.setTimeoutMs(this._idleTimeoutMs);

        // Set the proxy function call to extend the timer
        proxyCallback = () => idleTimeout.extend();
        idleTimeout.start();
      } else {
        proxyCallback = () => {};
      }

      const proxiedSession = proxyWithException({
        target: session,
        callback: proxyCallback,
        blockStatus: () => !this._activeSessionMap.has(id),
        exceptionMessage: "Session has been returned to the pool",
      });

      return {
        session: proxiedSession,
        done,
      };
    } catch (error) {
      // Return the session to the idle session map if it fails before returning to the user
      this._idleSessionMap.set(id, session);
      throw error;
    }
  }
}
